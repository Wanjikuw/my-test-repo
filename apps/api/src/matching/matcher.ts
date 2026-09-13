import type {
  IngredientMatch,
  MatchResult,
  RiskCategory,
  RegulatoryStatus,
  SkinType,
  SkinTypeConflict,
} from '@allergy-checker/shared';
import { looseInciName, normaliseInciName, parseIngredientList } from './normalise';

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

export interface IngredientIndex {
  strict: Map<string, IngredientRecord>;
  loose: Map<string, IngredientRecord>;
}

/**
 * Two indexes rather than one. `strict` keeps parentheses and is tried first; `loose`
 * drops common-name inserts and is only consulted on a miss, because dropping them can
 * in principle merge two different chemicals onto the same key.
 *
 * A name already claimed by another ingredient is not overwritten. Silently letting the
 * last writer win would make matches depend on row order.
 */
export function buildIngredientIndex(records: IngredientRecord[]): IngredientIndex {
  const strict = new Map<string, IngredientRecord>();
  const loose = new Map<string, IngredientRecord>();

  for (const record of records) {
    for (const name of [record.inciName, ...record.aliases]) {
      if (!name) continue;
      const strictKey = normaliseInciName(name);
      if (strictKey && !strict.has(strictKey)) strict.set(strictKey, record);
      const looseKey = looseInciName(name);
      if (looseKey && !loose.has(looseKey)) loose.set(looseKey, record);
    }
  }

  return { strict, loose };
}

export function lookup(index: IngredientIndex, rawName: string): IngredientRecord | undefined {
  return index.strict.get(normaliseInciName(rawName)) ?? index.loose.get(looseInciName(rawName));
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
}

/**
 * Resolves parsed ingredient names against the index. Pure — it performs no IO, so the
 * precedence rules can be exercised without a database.
 *
 * A name that resolves to an ingredient already seen is dropped rather than matched twice.
 * Labels legitimately repeat a name, and a duplicate would be explained twice in the result.
 */
export function matchNames(
  names: string[],
  index: IngredientIndex,
  rules: SensitivityRule[],
  options: MatchOptions,
): MatchResult {
  const declared = new Set((options.declaredAllergies ?? []).map(normaliseInciName));
  const matches: IngredientMatch[] = [];
  const unmatched: { rawText: string }[] = [];
  const seenIngredients = new Set<string>();
  const seenUnmatched = new Set<string>();

  for (const rawText of names) {
    const record = lookup(index, rawText);

    if (!record) {
      const key = normaliseInciName(rawText);
      if (!seenUnmatched.has(key)) {
        seenUnmatched.add(key);
        unmatched.push({ rawText });
      }
      continue;
    }

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
  }

  return { skinType: options.skinType, matches, unmatched };
}

/** Convenience wrapper: raw printed label in, MatchResult out. */
export function matchLabel(
  label: string,
  index: IngredientIndex,
  rules: SensitivityRule[],
  options: MatchOptions,
): MatchResult {
  return matchNames(parseIngredientList(label), index, rules, options);
}
