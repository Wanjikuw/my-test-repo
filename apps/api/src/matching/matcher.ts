import type {
  IngredientMatch,
  MatchResult,
  MatchStrategy,
  RiskCategory,
  RegulatoryStatus,
  SkinType,
  SkinTypeConflict,
  Suggestion,
  SunExposure,
} from '@allergy-checker/shared';
import { commonNameVariant, looseInciName, normaliseInciName } from './normalise';
import { distanceBudget, suggestFor } from './fuzzy';

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
 * Strongest first. Recorded on every match so the interface can be honest about which
 * resolutions were exact and which involved judgement.
 *
 * British spellings are not a strategy: they are folded in normalisation, which applies
 * to the index and the query alike, so `Sulphate` and `Sulfate` are the same key.
 */
const STRATEGY_RANK: Record<MatchStrategy, number> = {
  exact: 0,
  loose: 1,
  'common-name': 2,
  'alternate-name': 3,
};

interface IndexEntry {
  record: IngredientRecord;
  strategy: MatchStrategy;
  /** Position of `record` in `IngredientIndex.records`. */
  rank: number;
}

/** A resolved key paired with the name it belongs to, as fuzzy search consumes them. */
type Candidate = readonly [key: string, inciName: string];

export interface IngredientIndex {
  byName: Map<string, IndexEntry>;
  /**
   * The same keys bucketed by length, built once so fuzzy search can skip the ones it
   * could never reach. An edit budget of n means only keys within n characters are
   * candidates, which discards the overwhelming majority of a large corpus before any
   * distance is computed.
   */
  byLength: Map<number, Candidate[]>;
  /** The records in the order the index was built from, which is the order `rank` counts. */
  records: IngredientRecord[];
  /** Constant-time detail lookup, for `GET /ingredients/:id`. */
  byId: Map<string, IngredientRecord>;
  /**
   * Every ingredient printing a given exact name, not only the one that won the key. A
   * declared allergy is matched against this, so a name two records share flags both.
   */
  idsByExactName: Map<string, string[]>;
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const bucket = map.get(key);
  if (bucket) bucket.push(value);
  else map.set(key, [value]);
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
  const byId = new Map<string, IngredientRecord>();
  const idsByExactName = new Map<string, string[]>();

  const offer = (key: string, rank: number, strategy: MatchStrategy) => {
    if (!key) return;
    const existing = byName.get(key);
    if (existing && STRATEGY_RANK[existing.strategy] <= STRATEGY_RANK[strategy]) return;
    byName.set(key, { record: records[rank]!, strategy, rank });
  };

  for (const [rank, record] of records.entries()) {
    byId.set(record.id, record);
    for (const name of [record.inciName, ...record.aliases]) {
      if (!name) continue;
      const exact = normaliseInciName(name);
      offer(exact, rank, 'exact');
      offer(looseInciName(name), rank, 'loose');
      const common = commonNameVariant(name);
      if (common) offer(common, rank, 'common-name');
      if (exact && !idsByExactName.get(exact)?.includes(record.id)) {
        push(idsByExactName, exact, record.id);
      }
    }
  }

  // Bucketed after the fact, because a key can be reassigned to a stronger strategy while
  // the main loop is still running.
  const byLength = new Map<number, Candidate[]>();
  for (const [key, entry] of byName)
    push(byLength, key.length, [key, entry.record.inciName] as const);

  return { byName, byLength, records, byId, idsByExactName };
}

/** Keys close enough in length to be reachable within `budget` edits. */
function* candidatesWithin(
  index: IngredientIndex,
  length: number,
  budget: number,
): Generator<Candidate> {
  const lowest = Math.max(1, length - budget);
  for (let l = lowest; l <= length + budget; l++) {
    const bucket = index.byLength.get(l);
    if (bucket) yield* bucket;
  }
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

/** A slash inside these joins the parts of one substance, not several names for it. */
const COMPOUND_SLASH = /polymer|glyceride/i;

export interface AlternateResolution {
  resolution: Resolution;
  /** Slash-separated names that resolved to nothing. Reported as unrecognised, never dropped. */
  unresolved: string[];
}

/**
 * One entry printed under several names, `Aqua/Water/Eau` or `Parfum/Fragrance`, tried
 * only after the whole name has failed. It resolves when at least one part does and no
 * two parts name different ingredients. A part that resolves to nothing is handed back,
 * so it is still reported rather than absorbed into the match.
 *
 * Refused where the slash joins the parts of one substance — `Acrylates/C10-30 Alkyl
 * Acrylate Crosspolymer` — because a fragment of that could name a different ingredient.
 */
export function lookupAlternateNames(
  index: IngredientIndex,
  rawName: string,
): AlternateResolution | undefined {
  if (!rawName.includes('/') || COMPOUND_SLASH.test(rawName)) return undefined;

  let found: IngredientRecord | undefined;
  const unresolved: string[] = [];
  for (const part of rawName.split('/')) {
    const name = part.trim();
    if (!name) continue;
    const hit = lookup(index, name);
    if (!hit) unresolved.push(name);
    else if (found && found.id !== hit.record.id) return undefined;
    else found = hit.record;
  }

  return found
    ? { resolution: { record: found, strategy: 'alternate-name' }, unresolved }
    : undefined;
}

export interface DeclaredAllergies {
  ids: Set<string>;
  /** Names that resolve to no ingredient, so rule 2 can never fire on them. */
  unresolved: string[];
}

/**
 * A declared allergy flags every ingredient printing that exact name, and whatever the
 * name resolves to under the rules a label gets. One that names nothing is handed back,
 * so the interface can say so instead of the allergy failing in silence.
 */
export function resolveDeclaredAllergies(
  index: IngredientIndex,
  declared: readonly string[],
): DeclaredAllergies {
  const ids = new Set<string>();
  const unresolved: string[] = [];
  for (const name of declared) {
    const exact = index.idsByExactName.get(normaliseInciName(name)) ?? [];
    const resolved = lookup(index, name);
    for (const id of exact) ids.add(id);
    if (resolved) ids.add(resolved.record.id);
    if (exact.length === 0 && !resolved) unresolved.push(name);
  }
  return { ids, unresolved };
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

/** `rules` arrives already narrowed to the user's skin type, once per analysis. */
function conflictsFor(categories: RiskCategory[], rules: SensitivityRule[]): SkinTypeConflict[] {
  return rules
    .filter((rule) => categories.includes(rule.riskCategory))
    .map((rule) => ({ riskCategory: rule.riskCategory, interactionNote: rule.interactionNote }));
}

function suggestionsFor(index: IngredientIndex, query: string): Suggestion[] {
  const budget = distanceBudget(query);
  if (budget === 0) return [];
  return suggestFor(query, candidatesWithin(index, query.length, budget), budget);
}

export interface MatchOptions {
  skinType: SkinType | null;
  /**
   * Whether the product is worn where sunlight reaches the skin. Defaults to null, which
   * rule 6 treats as exposure being possible, so forgetting to ask cannot understate risk.
   */
  sunExposure?: SunExposure | null;
  /** Names the user has declared an allergy to; see `resolveDeclaredAllergies`. */
  declaredAllergies?: string[];
  /** Off by default so callers opt in to the cost of scanning the index. */
  suggestUnmatched?: boolean;
}

export interface MatchProvenance {
  rawText: string;
  inciName: string;
  strategy: MatchStrategy;
  /** Index of the printed entry it came from. */
  position: number;
}

export interface Unrecognised {
  rawText: string;
  position: number;
  suggestions: Suggestion[];
}

/**
 * `result` is exactly what `score()` consumes and nothing more. Provenance, positions and
 * suggestions travel alongside it rather than inside it, so no amount of fuzzy guessing
 * can reach the scoring rules.
 */
export interface LabelAnalysis {
  result: MatchResult;
  /** One per entry of `result.matches`, in the same order. */
  provenance: MatchProvenance[];
  /** One per entry of `result.unmatched`, in the same order. */
  unrecognised: Unrecognised[];
  unresolvedAllergies: string[];
}

/**
 * Resolves parsed ingredient names against the index in one pass. Pure — it performs no
 * IO, so the precedence rules can be exercised without a database.
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
  const allergies = resolveDeclaredAllergies(index, options.declaredAllergies ?? []);
  const applicable = options.skinType
    ? rules.filter((rule) => rule.skinType === options.skinType)
    : [];
  const matches: IngredientMatch[] = [];
  const unmatched: { rawText: string }[] = [];
  const provenance: MatchProvenance[] = [];
  const unrecognised: Unrecognised[] = [];
  const seenIngredients = new Set<string>();
  const seenUnmatched = new Set<string>();

  const miss = (rawText: string, position: number) => {
    const key = normaliseInciName(rawText);
    if (seenUnmatched.has(key)) return;
    seenUnmatched.add(key);
    unmatched.push({ rawText });
    unrecognised.push({
      rawText,
      position,
      suggestions: options.suggestUnmatched ? suggestionsFor(index, key) : [],
    });
  };

  for (const [position, rawText] of names.entries()) {
    const direct = lookup(index, rawText);
    const alternate = direct ? undefined : lookupAlternateNames(index, rawText);
    const resolved = direct ?? alternate?.resolution;

    if (!resolved) {
      miss(rawText, position);
      continue;
    }

    const { record, strategy } = resolved;
    if (!seenIngredients.has(record.id)) {
      seenIngredients.add(record.id);
      const categories = record.riskTags.map((t) => t.riskCategory);
      matches.push({
        ingredientId: record.id,
        inciName: record.inciName,
        riskCategories: categories,
        regulatoryStatus: record.regulatoryStatus,
        skinTypeConflicts: conflictsFor(categories, applicable),
        sourceCitation: citationFor(record),
        userDeclaredAllergyMatch: allergies.ids.has(record.id),
      });
      provenance.push({ rawText, inciName: record.inciName, strategy, position });
    }

    for (const part of alternate?.unresolved ?? []) miss(part, position);
  }

  return {
    result: {
      skinType: options.skinType,
      sunExposure: options.sunExposure ?? null,
      matches,
      unmatched,
    },
    provenance,
    unrecognised,
    unresolvedAllergies: allergies.unresolved,
  };
}
