import type { Suggestion } from '@allergy-checker/shared';

/**
 * Fuzzy candidate search, for OCR slips and typing errors.
 *
 * Nothing here ever produces a match. A fuzzy hit is a *suggestion* the user must
 * confirm, and it is kept out of `MatchResult` entirely so the scoring engine cannot
 * see it. That separation is deliberate: an OCR misread of `Limonene` must never be
 * able to silently move a product from Safe to Avoid, or the reverse.
 */

const UNREACHABLE = 1 << 20;

// Two reusable rows. This runs against thousands of candidates per unrecognised name, and
// allocating a row per character per candidate was most of its cost.
let previous = new Int32Array(256);
let current = new Int32Array(256);

/**
 * Levenshtein distance within `limit`, or `limit + 1` once it provably exceeds it.
 *
 * Only the diagonal band of width `2 × limit + 1` is computed, because a cell further
 * from the diagonal than `limit` already costs more than `limit` edits. That makes one
 * comparison O(limit × length) rather than O(length²), and it still abandons a row as
 * soon as no cell in it can come back under the limit.
 */
export function boundedEditDistance(a: string, b: string, limit: number): number {
  if (a === b) return 0;
  const n = a.length;
  const m = b.length;
  if (Math.abs(n - m) > limit) return limit + 1;

  if (m + 2 > previous.length) {
    previous = new Int32Array(m + 2);
    current = new Int32Array(m + 2);
  }

  for (let j = 0; j <= m + 1; j++) previous[j] = j <= limit ? j : UNREACHABLE;

  for (let i = 1; i <= n; i++) {
    const from = Math.max(1, i - limit);
    const to = Math.min(m, i + limit);
    current[from - 1] = from === 1 ? i : UNREACHABLE;
    if (to < m) current[to + 1] = UNREACHABLE;

    const code = a.charCodeAt(i - 1);
    // Column 0 is a real cell whenever the band reaches it, and may be the row's minimum.
    let rowMin = from === 1 ? i : UNREACHABLE;
    for (let j = from; j <= to; j++) {
      const substitution = previous[j - 1]! + (code === b.charCodeAt(j - 1) ? 0 : 1);
      const deletion = previous[j]! + 1;
      const insertion = current[j - 1]! + 1;
      const best = Math.min(substitution, deletion, insertion);
      current[j] = best;
      if (best < rowMin) rowMin = best;
    }

    if (rowMin > limit) return limit + 1;
    [previous, current] = [current, previous];
  }

  const distance = previous[m]!;
  return distance > limit ? limit + 1 : distance;
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

/**
 * Best candidates for one unrecognised name, nearest first. Returns nothing when the
 * budget is zero, rather than offering a guess we cannot stand behind.
 */
export function suggestFor(
  normalisedQuery: string,
  candidates: Iterable<readonly [key: string, inciName: string]>,
  limit = distanceBudget(normalisedQuery),
  maxSuggestions = 3,
): Suggestion[] {
  if (limit === 0) return [];

  // Several keys can belong to one ingredient; it is offered once, at its nearest.
  const nearest = new Map<string, number>();
  for (const [key, inciName] of candidates) {
    const distance = boundedEditDistance(normalisedQuery, key, limit);
    if (distance > limit || distance === 0) continue;
    const seen = nearest.get(inciName);
    if (seen === undefined || distance < seen) nearest.set(inciName, distance);
  }

  return [...nearest]
    .map(([candidate, distance]) => ({ candidate, distance }))
    .sort((x, y) => x.distance - y.distance || x.candidate.localeCompare(y.candidate))
    .slice(0, maxSuggestions);
}
