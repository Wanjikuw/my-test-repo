/**
 * Turning a printed ingredient label into names we can look up.
 *
 * Every rule here exists because a real label broke something, not because it seemed
 * tidy. The two that matter most:
 *
 *   Commas are not reliable separators. INCI names contain them — `1,2-Hexanediol`,
 *   `2,6-Dihydroxy-4-methyl-benzaldehyde`. Splitting on every comma shreds those into
 *   fragments that can never match. We split only on commas that are not sitting
 *   between two digits.
 *
 *   Labels carry invisible characters. A list copied from a retailer's site arrived with
 *   a zero-width space inside `Caprylic/<U+200B>Capric Triglyceride`, which defeats exact
 *   comparison while looking identical on screen.
 */

/** Zero-width space, ZWNJ, ZWJ, LRM, RLM and the BOM. */
const INVISIBLE = /[\u200b-\u200f\ufeff]/g;

/** En dash, em dash and friends, which labels use where INCI uses a plain hyphen. */
const UNICODE_DASHES = /[\u2010-\u2015\u2212]/g;

/** Organic/origin markers and trailing punctuation printed alongside a name. */
const TRAILING_NOISE = /[*†‡.\s]+$/;

/**
 * Common-name inserts sit inside an INCI binomial: `Simmondsia Chinensis (Jojoba) Seed
 * Oil`. Stripping them is lossy — our own Annex II names contain meaningful parentheses,
 * such as `3- and 4-(4-Hydroxy-4-methylpentyl) cyclohex-3-ene-1-carbaldehyde (HICC)` —
 * so this is applied only as a fallback, never as the primary key.
 */
const PARENTHETICAL = /\([^)]*\)/g;

/** Shared by both forms: the transformations that cannot lose information. */
function baseNormalise(raw: string): string {
  return raw
    .replace(INVISIBLE, '')
    .replace(UNICODE_DASHES, '-')
    .replace(TRAILING_NOISE, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Primary lookup key. Preserves parentheses, so it cannot collide two chemical names. */
export function normaliseInciName(raw: string): string {
  return baseNormalise(raw);
}

/**
 * Fallback lookup key, with common-name inserts removed. Used only after the strict form
 * misses, because it can in principle merge two distinct chemicals.
 */
export function looseInciName(raw: string): string {
  return baseNormalise(raw.replace(PARENTHETICAL, ' ')).replace(/\s+/g, ' ').trim();
}

/**
 * Splits a printed list into individual names.
 *
 * Separators: newlines, semicolons, and commas that are not between two digits. The
 * digit guard is what keeps `1,2-Hexanediol` in one piece.
 */
export function parseIngredientList(label: string): string[] {
  return label
    .replace(INVISIBLE, '')
    .split(/(?<!\d),(?!\d)|[;\n\r]+/)
    .map((part) => part.replace(TRAILING_NOISE, '').replace(/\s+/g, ' ').trim())
    .filter((part) => part.length > 0);
}
