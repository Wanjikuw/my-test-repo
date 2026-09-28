import type { IngredientMatch, ScoredResult, SkinType, SunExposure } from './scoring';

/**
 * The wire contract for `POST /analyze`, shared so the API and the web app cannot drift.
 * Response shapes only: the request is validated server-side, where the limits live.
 */

/**
 * How a printed name was resolved, strongest first. Surfaced to the user because a
 * resolution that involved judgement should not be presented as if it were exact.
 *
 * `alternate-name` is one entry printed under several names, `Aqua/Water/Eau`, where one
 * of the slash-separated names resolved and none contradicted it.
 */
export type MatchStrategy = 'exact' | 'loose' | 'common-name' | 'alternate-name';

export interface MatchedIngredient extends IngredientMatch {
  /** The text as printed on the label, which is often not the INCI name it resolved to. */
  matchedFrom: string;
  strategy: MatchStrategy;
  /** Zero-based index of the printed entry, so the list can be rebuilt in printed order. */
  position: number;
}

export interface Suggestion {
  candidate: string;
  distance: number;
}

export interface UnrecognisedIngredient {
  rawText: string;
  /** Zero-based index of the printed entry it came from. */
  position: number;
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
    /** Declared allergies that name nothing in the reference data, so rule 2 cannot fire on them. */
    unresolvedAllergies: string[];
  };
  matched: MatchedIngredient[];
  unmatched: UnrecognisedIngredient[];
  coverage: Coverage;
  corpus: { ingredientCount: number; loadedAt: string };
}
