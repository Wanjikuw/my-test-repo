/**
 * Fuzzy candidate search, for OCR slips and typing errors.
 *
 * Nothing here ever produces a match. A fuzzy hit is a *suggestion* the user must
 * confirm, and it is kept out of `MatchResult` entirely so the scoring engine cannot
 * see it. That separation is deliberate: an OCR misread of `Limonene` must never be
 * able to silently move a product from Safe to Avoid, or the reverse.
 */

/**
 * Levenshtein distance, abandoned early once it provably exceeds `limit`.
 *
 * The bail-out matters because this runs against every indexed name for every
 * unrecognised token on a label.
 */
export function boundedEditDistance(a: string, b: string, limit: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > limit) return limit + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;

    for (let j = 1; j <= b.length; j++) {
      const substitution = previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1);
      const insertion = current[j - 1]! + 1;
      const deletion = previous[j]! + 1;
      const best = Math.min(substitution, insertion, deletion);
      current.push(best);
      if (best < rowMin) rowMin = best;
    }

    if (rowMin > limit) return limit + 1;
    previous = current;
  }

  return previous[b.length]!;
}

/**
 * Short names get a tighter budget. At two edits, `Urea` would reach `Borax`, which is a
 * different substance entirely — the allowance has to scale with the length of the word.
 */
export function distanceBudget(name: string): number {
  if (name.length <= 5) return 0;
  if (name.length <= 9) return 1;
  return 2;
}

export interface Suggestion {
  /** The unrecognised text as printed on the label. */
  rawText: string;
  /** INCI name of the ingredient we think was intended. */
  candidate: string;
  distance: number;
}

/**
 * Best candidates for one unrecognised name, nearest first. Returns nothing when the
 * budget is zero, rather than offering a guess we cannot stand behind.
 */
export function suggestFor(
  rawText: string,
  normalisedQuery: string,
  candidates: Iterable<readonly [string, string]>,
  maxSuggestions = 3,
): Suggestion[] {
  const limit = distanceBudget(normalisedQuery);
  if (limit === 0) return [];

  const found: Suggestion[] = [];
  const seen = new Set<string>();

  for (const [key, inciName] of candidates) {
    const distance = boundedEditDistance(normalisedQuery, key, limit);
    if (distance > limit || distance === 0) continue;
    if (seen.has(inciName)) continue;
    seen.add(inciName);
    found.push({ rawText, candidate: inciName, distance });
  }

  return found
    .sort((x, y) => x.distance - y.distance || x.candidate.localeCompare(y.candidate))
    .slice(0, maxSuggestions);
}
