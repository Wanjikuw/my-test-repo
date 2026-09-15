import type { IngredientMatch, ScoredResult, SkinType, SunExposure } from './scoring';

/**
 * The wire contract for `POST /analyze`, shared so the API and the web app cannot drift.
 * Response shapes only: the request is validated server-side, where the limits live.
 */

/**
 * How a printed name was resolved, strongest first. Surfaced to the user because a
 * resolution that involved judgement should not be presented as if it were exact.
 */
export type MatchStrategy = 'exact' | 'loose' | 'common-name';

export interface MatchedIngredient extends IngredientMatch {
  /** The text as printed on the label, which is often not the INCI name it resolved to. */
  matchedFrom: string;
  strategy: MatchStrategy;
}

export interface Suggestion {
  candidate: string;
  distance: number;
}

export interface UnrecognisedIngredient {
  rawText: string;
  /** Near-misses, nearest first. Advisory only — these never reached the scoring rules. */
  suggestions: Suggestion[];
}

/**
 * How much of the label the corpus could actually identify.
 *
 * Sent rather than derived in the browser. The interface is required to show it at the
 * same weight as the verdict — the median real label carries ten names the corpus cannot
 * identify — and a second implementation on the client could disagree with the tier it
 * sits beside.
 */
export interface Coverage {
  identified: number;
  total: number;
  /** 0–1. A label with no names at all is reported as complete: nothing went unchecked. */
  ratio: number;
}

export function coverageOf(identified: number, unrecognised: number): Coverage {
  const total = identified + unrecognised;
  return { identified, total, ratio: total === 0 ? 1 : identified / total };
}

export interface AnalyzeResponse {
  tier: ScoredResult['tier'];
  explanations: ScoredResult['explanations'];
  profile: {
    skinType: SkinType | null;
    sunExposure: SunExposure | null;
  };
  matched: MatchedIngredient[];
  unmatched: UnrecognisedIngredient[];
  coverage: Coverage;
  corpus: { ingredientCount: number; loadedAt: string };
}
