import type {
  IngredientMatch,
  MatchResult,
  RiskCategory,
  RegulatoryStatus,
  SkinType,
  SkinTypeConflict,
} from '@allergy-checker/shared';
import {
  commonNameVariant,
  looseInciName,
  normaliseInciName,
  parseIngredientList,
} from './normalise';
import { suggestFor, type Suggestion } from './fuzzy';

/** One ingredient as the matcher needs it, independent of how it was loaded. */
export interface IngredientRecord {
  id: string;
  inciName: string;
  aliases: string[];
  regulatoryStatus: RegulatoryStatus;
  sourceCitation: string;
  riskTags: { riskCategory: RiskCategory; sourceCitation: string }[];
}

export interface SensitivityRule {
  skinType: SkinType;
  riskCategory: RiskCategory;
  interactionNote: string;
}

/**
 * How a name was resolved, strongest first. Recorded on every match so the interface can
 * be honest about which resolutions were exact and which involved judgement.
 *
 * British spellings are not a strategy: they are folded in normalisation, which applies
 * to the index and the query alike, so `Sulphate` and `Sulfate` are the same key.
 */
export type MatchStrategy = 'exact' | 'loose' | 'common-name';

const STRATEGY_RANK: Record<MatchStrategy, number> = {
  exact: 0,
  loose: 1,
  'common-name': 2,
};

interface IndexEntry {
  record: IngredientRecord;
  strategy: MatchStrategy;
}

export interface IngredientIndex {
  byName: Map<string, IndexEntry>;
}

/**
 * One key space, with each key remembering how it was derived.
 *
 * A key is only overwritten by a strictly stronger strategy. Without that rule a loose or
 * common-name key generated from one ingredient could shadow another ingredient's exact
 * name, and which one won would depend on row order.
 */
export function buildIngredientIndex(records: IngredientRecord[]): IngredientIndex {
  const byName = new Map<string, IndexEntry>();

  const offer = (key: string, record: IngredientRecord, strategy: MatchStrategy) => {
    if (!key) return;
    const existing = byName.get(key);
    if (existing && STRATEGY_RANK[existing.strategy] <= STRATEGY_RANK[strategy]) return;
    byName.set(key, { record, strategy });
  };

  for (const record of records) {
    for (const name of [record.inciName, ...record.aliases]) {
      if (!name) continue;
      offer(normaliseInciName(name), record, 'exact');
      offer(looseInciName(name), record, 'loose');
      const common = commonNameVariant(name);
      if (common) offer(common, record, 'common-name');
    }
  }

  return { byName };
}

export interface Resolution {
  record: IngredientRecord;
  strategy: MatchStrategy;
}

/**
 * Both sides can involve judgement: the query may have to be loosened to hit a key, and
 * the key itself may have been derived rather than printed. The reported strategy is the
 * weaker of the two, so a resolution is never described as more certain than it was.
 */
export function lookup(index: IngredientIndex, rawName: string): Resolution | undefined {
  const attempts: ReadonlyArray<readonly [string, MatchStrategy]> = [
    [normaliseInciName(rawName), 'exact'],
    [looseInciName(rawName), 'loose'],
  ];

  for (const [key, queryStep] of attempts) {
    const hit = index.byName.get(key);
    if (!hit) continue;
    const strategy =
      STRATEGY_RANK[queryStep] >= STRATEGY_RANK[hit.strategy] ? queryStep : hit.strategy;
    return { record: hit.record, strategy };
  }

  return undefined;
}

/**
 * The scoring contract carries one citation per matched ingredient, but an ingredient can
 * hold several risk tags with different sources. All of them are joined so no evidence is
 * dropped; an untagged ingredient falls back to its identity citation.
 */
function citationFor(record: IngredientRecord): string {
  const tagCitations = [...new Set(record.riskTags.map((t) => t.sourceCitation))].filter(Boolean);
  return tagCitations.length > 0 ? tagCitations.join(' | ') : record.sourceCitation;
}

function conflictsFor(
  categories: RiskCategory[],
  skinType: SkinType | null,
  rules: SensitivityRule[],
): SkinTypeConflict[] {
  if (!skinType) return [];
  return rules
    .filter((rule) => rule.skinType === skinType && categories.includes(rule.riskCategory))
    .map((rule) => ({ riskCategory: rule.riskCategory, interactionNote: rule.interactionNote }));
}

export interface MatchOptions {
  skinType: SkinType | null;
  /** INCI names the user has declared an allergy to; matched after normalisation. */
  declaredAllergies?: string[];
  /** Off by default so callers opt in to the cost of scanning the whole index. */
  suggestUnmatched?: boolean;
}

export interface MatchProvenance {
  rawText: string;
  inciName: string;
  strategy: MatchStrategy;
}

/**
 * `result` is exactly what `score()` consumes and nothing more. Provenance and
 * suggestions travel alongside it rather than inside it, so no amount of fuzzy guessing
 * can reach the scoring rules.
 */
export interface LabelAnalysis {
  result: MatchResult;
  provenance: MatchProvenance[];
  suggestions: Suggestion[];
}

/**
 * Resolves parsed ingredient names against the index. Pure — it performs no IO, so the
 * precedence rules can be exercised without a database.
 *
 * A name that resolves to an ingredient already seen is dropped rather than matched twice.
 * Labels legitimately repeat a name, and a duplicate would be explained twice in the result.
 */
export function analyseNames(
  names: string[],
  index: IngredientIndex,
  rules: SensitivityRule[],
  options: MatchOptions,
): LabelAnalysis {
  const declared = new Set((options.declaredAllergies ?? []).map(normaliseInciName));
  const matches: IngredientMatch[] = [];
  const unmatched: { rawText: string }[] = [];
  const provenance: MatchProvenance[] = [];
  const seenIngredients = new Set<string>();
  const seenUnmatched = new Set<string>();

  for (const rawText of names) {
    const resolved = lookup(index, rawText);

    if (!resolved) {
      const key = normaliseInciName(rawText);
      if (!seenUnmatched.has(key)) {
        seenUnmatched.add(key);
        unmatched.push({ rawText });
      }
      continue;
    }

    const { record, strategy } = resolved;
    if (seenIngredients.has(record.id)) continue;
    seenIngredients.add(record.id);

    const categories = record.riskTags.map((t) => t.riskCategory);
    const allergyMatch =
      declared.has(normaliseInciName(record.inciName)) ||
      record.aliases.some((alias) => declared.has(normaliseInciName(alias)));

    matches.push({
      ingredientId: record.id,
      inciName: record.inciName,
      riskCategories: categories,
      regulatoryStatus: record.regulatoryStatus,
      skinTypeConflicts: conflictsFor(categories, options.skinType, rules),
      sourceCitation: citationFor(record),
      userDeclaredAllergyMatch: allergyMatch,
    });
    provenance.push({ rawText, inciName: record.inciName, strategy });
  }

  const suggestions: Suggestion[] = [];
  if (options.suggestUnmatched) {
    const candidates = [...index.byName].map(
      ([key, entry]) => [key, entry.record.inciName] as const,
    );
    for (const { rawText } of unmatched) {
      suggestions.push(...suggestFor(rawText, normaliseInciName(rawText), candidates));
    }
  }

  return {
    result: { skinType: options.skinType, matches, unmatched },
    provenance,
    suggestions,
  };
}

/** Raw printed label in, analysis out. */
export function analyseLabel(
  label: string,
  index: IngredientIndex,
  rules: SensitivityRule[],
  options: MatchOptions,
): LabelAnalysis {
  return analyseNames(parseIngredientList(label), index, rules, options);
}

/** Convenience for callers that only want what the scoring engine consumes. */
export function matchNames(
  names: string[],
  index: IngredientIndex,
  rules: SensitivityRule[],
  options: MatchOptions,
): MatchResult {
  return analyseNames(names, index, rules, options).result;
}

export function matchLabel(
  label: string,
  index: IngredientIndex,
  rules: SensitivityRule[],
  options: MatchOptions,
): MatchResult {
  return analyseLabel(label, index, rules, options).result;
}

export type { Suggestion };
