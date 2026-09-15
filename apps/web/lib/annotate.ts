import type {
  AnalyzeResponse,
  MatchStrategy,
  ScoredResult,
  Suggestion,
} from '@allergy-checker/shared';

type Explanation = ScoredResult['explanations'][number];

/**
 * Three states, and the third is the point. `unread` is not a milder `flagged` — it means
 * the corpus holds no record of the name, so nothing was checked either way.
 */
export type Annotation = 'flagged' | 'clean' | 'unread';

export interface AnnotatedName {
  /** The text as printed on the label. */
  printed: string;
  /** The INCI name it resolved to, where that differs from what was printed. */
  resolved: string | null;
  annotation: Annotation;
  strategy: MatchStrategy | null;
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
 * in the interface could disagree with the verdict shown beside it.
 *
 * Order is recovered by finding each printed name in the original text, because the
 * response reports matched and unmatched separately. Anything not found sorts last, which
 * only happens if the text changed after it was submitted.
 */
export function annotate(label: string, result: AnalyzeResponse): AnnotatedName[] {
  const reasonsFor = new Map<string, Explanation[]>();
  for (const explanation of result.explanations) {
    const existing = reasonsFor.get(explanation.ingredientName);
    if (existing) existing.push(explanation);
    else reasonsFor.set(explanation.ingredientName, [explanation]);
  }

  const names: AnnotatedName[] = [
    ...result.matched.map((match): AnnotatedName => {
      const reasons = reasonsFor.get(match.inciName) ?? [];
      // The Glossary prints its names in capitals, so an exact comparison would render
      // `Glycerin -> GLYCERIN` and present it as though it were information.
      const differsBeyondCase = match.inciName.toLowerCase() !== match.matchedFrom.toLowerCase();
      return {
        printed: match.matchedFrom,
        resolved: differsBeyondCase ? match.inciName : null,
        annotation: reasons.length > 0 ? 'flagged' : 'clean',
        strategy: match.strategy,
        reasons,
        citation: match.sourceCitation,
        suggestions: [],
      };
    }),
    ...result.unmatched.map((entry): AnnotatedName => ({
      printed: entry.rawText,
      resolved: null,
      annotation: 'unread',
      strategy: null,
      reasons: reasonsFor.get(entry.rawText) ?? [],
      citation: null,
      suggestions: entry.suggestions,
    })),
  ];

  const positionOf = (name: AnnotatedName) => {
    const at = label.indexOf(name.printed);
    return at === -1 ? Number.MAX_SAFE_INTEGER : at;
  };
  return names.sort((a, b) => positionOf(a) - positionOf(b));
}

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
