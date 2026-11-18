import type {
  AnalyzeResponse,
  MatchStrategy,
  RegulatoryStatus,
  RiskCategory,
  ScoredResult,
  Suggestion,
} from '@allergy-checker/shared';

type Explanation = ScoredResult['explanations'][number];

/**
 * Four states, and the two middle ones are the point.
 *
 * `noted` is an ingredient the reference data has something on record about, where no
 * rule fired for this profile — Linalool is a declarable fragrance allergen whether or
 * not you reported sensitive skin. Collapsing it into `clean` hides a fact; collapsing it
 * into `flagged` claims a risk that was not established for this person.
 *
 * `unread` is not a milder `flagged`: the corpus holds no record of the name at all, so
 * nothing was checked either way.
 */
export type Annotation = 'flagged' | 'noted' | 'clean' | 'unread';

/** Where an entry sat in the printed list. Labels list the largest shares first. */
export type Placement = 'early' | 'middle' | 'late';

/** Below this many entries a third of the list says nothing useful. */
const MIN_ENTRIES_FOR_PLACEMENT = 6;

export function placementOf(position: number, entries: number): Placement | null {
  if (entries < MIN_ENTRIES_FOR_PLACEMENT || position < 0 || position >= entries) return null;
  const fraction = position / (entries - 1);
  if (fraction < 1 / 3) return 'early';
  return fraction > 2 / 3 ? 'late' : 'middle';
}

export const PLACEMENT_NOTE: Record<Placement, string> = {
  early: 'Listed early, so likely a larger share of the product.',
  middle: 'Listed in the middle of the label.',
  late: 'Listed near the end, so probably a small amount. Order only reflects amount above 1%.',
};

export interface AnnotatedName {
  /** The text as printed on the label. */
  printed: string;
  /** Zero-based index of the printed entry. */
  position: number;
  /** Display only: it never feeds the verdict. Null for an unread name or a short label. */
  placement: Placement | null;
  /** The INCI name it resolved to, where that differs from what was printed. */
  resolved: string | null;
  annotation: Annotation;
  strategy: MatchStrategy | null;
  /** What the reference data holds on this ingredient, regardless of this profile. */
  riskCategories: RiskCategory[];
  regulatoryStatus: RegulatoryStatus;
  /** Explanations naming this ingredient, taken from the engine rather than re-derived. */
  reasons: Explanation[];
  citation: string | null;
  suggestions: Suggestion[];
}

/**
 * Rebuilds the label as a list, in the order it was printed.
 *
 * Which ingredients are flagged comes from `explanations` rather than from re-reading
 * `riskCategories` here. The precedence tree decides what fires; a second implementation
 * in the interface could disagree with the verdict shown beside it. The categories are
 * still displayed, but as a record of what is known, never as a verdict of our own.
 *
 * Both lists arrive in printed order with their positions, so one merge rebuilds the
 * label: no search of the text, which put `Oil` wherever the first name containing it
 * sat, and no sort.
 */
export function annotate(result: AnalyzeResponse): AnnotatedName[] {
  let entries = 0;
  for (const m of result.matched) entries = Math.max(entries, m.position + 1);
  for (const u of result.unmatched) entries = Math.max(entries, u.position + 1);

  const reasonsFor = new Map<string, Explanation[]>();
  for (const explanation of result.explanations) {
    const existing = reasonsFor.get(explanation.ingredientName);
    if (existing) existing.push(explanation);
    else reasonsFor.set(explanation.ingredientName, [explanation]);
  }

  const matched = result.matched.map((match): AnnotatedName => {
    const reasons = reasonsFor.get(match.inciName) ?? [];
    const onRecord = match.riskCategories.length > 0 || match.regulatoryStatus !== 'none';
    // The Glossary prints its names in capitals, so an exact comparison would render
    // `Glycerin -> GLYCERIN` and present it as though it were information.
    const differsBeyondCase = match.inciName.toLowerCase() !== match.matchedFrom.toLowerCase();
    return {
      printed: match.matchedFrom,
      position: match.position,
      placement: onRecord ? placementOf(match.position, entries) : null,
      resolved: differsBeyondCase ? match.inciName : null,
      annotation: reasons.length > 0 ? 'flagged' : onRecord ? 'noted' : 'clean',
      strategy: match.strategy,
      riskCategories: match.riskCategories,
      regulatoryStatus: match.regulatoryStatus,
      reasons,
      // An identity-only row cites the Glossary at paragraph length and says nothing
      // about risk, so it is not worth repeating under every benign ingredient.
      citation: onRecord ? match.sourceCitation : null,
      suggestions: [],
    };
  });

  const unread = result.unmatched.map((entry): AnnotatedName => ({
    printed: entry.rawText,
    position: entry.position,
    placement: null,
    resolved: null,
    annotation: 'unread',
    strategy: null,
    riskCategories: [],
    regulatoryStatus: 'none',
    reasons: reasonsFor.get(entry.rawText) ?? [],
    citation: null,
    suggestions: entry.suggestions,
  }));

  // On a tie — one entry printed under several names — the match comes first and the part
  // that could not be read follows it.
  const merged: AnnotatedName[] = [];
  let i = 0;
  let j = 0;
  while (i < matched.length || j < unread.length) {
    const next = matched[i];
    const other = unread[j];
    if (next && (!other || next.position <= other.position)) {
      merged.push(next);
      i++;
    } else if (other) {
      merged.push(other);
      j++;
    }
  }
  return merged;
}

/** Noun phrases for display. Exhaustive, so adding a category fails the build here. */
export const CATEGORY_LABEL: Record<RiskCategory, string> = {
  fragrance_allergen: 'Declarable fragrance allergen',
  preservative_sensitizer: 'Preservative sensitiser',
  common_irritant: 'Documented irritant',
  comedogenic: 'Comedogenic',
  photosensitizing: 'Increases sensitivity to sunlight',
};

export const STATUS_LABEL: Record<RegulatoryStatus, string | null> = {
  none: null,
  restricted: 'Restricted use',
  prohibited: 'Prohibited in cosmetics',
  prohibited_as_fragrance: 'Prohibited as a fragrance',
};

export const TIER_LABEL: Record<ScoredResult['tier'], string> = {
  Avoid: 'Avoid',
  Caution: 'Caution',
  UnverifiedCaution: 'Cannot verify',
  Safe: 'No flags found',
};

/** Tier wording is never the whole story, so each carries the caveat it needs. */
export const TIER_NOTE: Record<ScoredResult['tier'], string> = {
  Avoid:
    'An ingredient here is prohibited, on your declared list, or escalated for your skin type.',
  Caution: 'An ingredient here carries a documented risk relevant to your profile.',
  UnverifiedCaution:
    'Some names on this label are not in the reference data, so they could not be checked.',
  Safe: 'Nothing that could be identified triggered a rule.',
};
