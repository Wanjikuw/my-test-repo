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
const TRAILING_NOISE = /[*\u2020\u2021.\s]+$/;

/**
 * Common-name inserts sit inside an INCI binomial: `Simmondsia Chinensis (Jojoba) Seed
 * Oil`. Stripping them is lossy — our own Annex II names contain meaningful parentheses,
 * such as `3- and 4-(4-Hydroxy-4-methylpentyl) cyclohex-3-ene-1-carbaldehyde (HICC)` —
 * so this is applied only as a fallback, never as the primary key.
 */
const PARENTHETICAL = /\([^)]*\)/g;

/**
 * British spellings, folded onto the American forms the INCI glossary uses. Applied to
 * both the index and the query, so the direction of the fold cannot matter.
 *
 * Orthographic variants only. Genuine synonyms such as Parfum/Fragrance are a data
 * question and belong in an ingredient's `aliases`, not in normalisation — collapsing
 * them here would hide the relationship from anyone reading the dataset.
 */
const SPELLING_VARIANTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/sulphate/g, 'sulfate'],
  [/sulphite/g, 'sulfite'],
  [/sulphur/g, 'sulfur'],
  [/aluminium/g, 'aluminum'],
  [/colour/g, 'color'],
  [/glycerine/g, 'glycerin'],
];

function canonicaliseSpelling(lowercased: string): string {
  let out = lowercased;
  for (const [pattern, replacement] of SPELLING_VARIANTS) out = out.replace(pattern, replacement);
  return out;
}

/** Shared by every form: the transformations that cannot lose information. */
function baseNormalise(raw: string): string {
  return canonicaliseSpelling(
    raw
      .replace(INVISIBLE, '')
      .replace(UNICODE_DASHES, '-')
      .replace(TRAILING_NOISE, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase(),
  );
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
 * A label may print the common name alone where the dataset holds the binomial:
 * `Theobroma Cacao (Cocoa) Seed Butter` is also sold as `Cocoa Seed Butter`. This swaps
 * the binomial for the bracketed common name.
 *
 * Only fires when there is exactly one parenthetical and it is purely alphabetic. That
 * guard is what stops chemical fragments like `(4-Hydroxy-4-methylpentyl)` from
 * generating a nonsense key that fuzzy search could later latch onto.
 */
export function commonNameVariant(raw: string): string | null {
  const cleaned = raw.replace(INVISIBLE, '').trim();
  const matches = cleaned.match(/\([^)]*\)/g);
  if (!matches || matches.length !== 1) return null;

  const insert = matches[0]!.slice(1, -1).trim();
  if (!/^[A-Za-z][A-Za-z\s]*$/.test(insert)) return null;

  const open = cleaned.indexOf('(');
  const close = cleaned.indexOf(')');
  const before = cleaned.slice(0, open).trim();
  const after = cleaned.slice(close + 1).trim();
  if (!before) return null;

  const variant = baseNormalise(`${insert} ${after}`).replace(/\s+/g, ' ').trim();
  return variant.length > 0 ? variant : null;
}

/**
 * Splits a printed list into individual names.
 *
 * Separators: newlines, semicolons, and commas that are not between two digits. The
 * digit guard is what keeps `1,2-Hexanediol` in one piece.
 *
 * Both sides have to be digits for the guard to hold, hence the two alternatives rather
 * than one lookaround pair. Requiring only that neither side is a digit also swallowed
 * the comma in `CI 77491, CI 77492`, merging a colour-index run into a single name that
 * could never match.
 */
export function parseIngredientList(label: string): string[] {
  return label
    .replace(INVISIBLE, '')
    .split(/(?<!\d),|,(?!\d)|[;\n\r]+/)
    .map((part) => part.replace(TRAILING_NOISE, '').replace(/\s+/g, ' ').trim())
    .filter((part) => part.length > 0);
}
