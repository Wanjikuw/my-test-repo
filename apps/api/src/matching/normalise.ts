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
 *
 * One alternation rather than a list of patterns, so a name is scanned once. `sulph`
 * covers sulphate, sulphite, sulphur and the sulpho- compounds alike.
 */
const SPELLING_VARIANT = /sulph|aluminium|colour|glycerine/g;

const SPELLING_FOLD: Readonly<Record<string, string>> = {
  sulph: 'sulf',
  aluminium: 'aluminum',
  colour: 'color',
  glycerine: 'glycerin',
};

/**
 * Primary lookup key: the transformations that cannot lose information. Preserves
 * parentheses, so it cannot collide two chemical names.
 */
export function normaliseInciName(raw: string): string {
  return raw
    .replace(INVISIBLE, '')
    .replace(UNICODE_DASHES, '-')
    .replace(TRAILING_NOISE, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(SPELLING_VARIANT, (variant) => SPELLING_FOLD[variant] ?? variant);
}

/**
 * Fallback lookup key, with common-name inserts removed. Used only after the strict form
 * misses, because it can in principle merge two distinct chemicals.
 */
export function looseInciName(raw: string): string {
  return normaliseInciName(raw.replace(PARENTHETICAL, ' '));
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

  const variant = normaliseInciName(`${insert} ${after}`);
  return variant.length > 0 ? variant : null;
}

/**
 * Label furniture that is not an ingredient. A pasted or photographed list usually
 * arrives with its heading, and without this the first name reads `Ingredients: Aqua` and
 * never matches. Everything before the first heading is the front of the pack; a later
 * heading is the list repeated in another language, so it becomes a separator.
 */
const HEADING =
  /\b(?:ingr[eé]dients?|zutaten|ingredientes|ingredienti|ingredi[eë]nten|composition|inci)\s*[:：]/i;
const HEADINGS = new RegExp(HEADING.source, 'gi');

/** OCR drops colons. A bare heading word is only trusted where it opens the text. */
const LEADING_HEADING = /^\s*(?:ingr[eé]dients?|inci)\b[\s:：.-]*/i;

/**
 * Colour cosmetics print shades that may or may not be present as `[+/- CI 77491,
 * CI 77492]` or `May contain:`. The marker is not a name, and the bracket must not fuse
 * the first shade onto it.
 */
const MAY_CONTAIN_BLOCK = /\[\s*(?:\+\s*\/\s*-|±|may contain:?|peut contenir:?)\s*([^\]]*)\]/gi;
const MAY_CONTAIN_MARKER =
  /\(\s*\+\s*\/\s*-\s*\)|\+\s*\/\s*-|±|\bmay contain\b:?|\bpeut contenir\b:?/gi;

/** A concentration printed after a name, `Niacinamide 10%`. No INCI name ends in one. */
const TRAILING_PERCENT = /\s*\(?\s*\d+(?:[.,]\d+)?\s*%\s*\)?$/;

/** Bullets and list dashes printed ahead of a name. */
const LEADING_NOISE = /^(?:[•·*\s]|[-–—]\s)+/;

/**
 * Newlines, semicolons, bullets, full-width commas, and commas that are not between two
 * digits. The digit guard is what keeps `1,2-Hexanediol` in one piece.
 *
 * Both sides have to be digits for the guard to hold, hence the two alternatives rather
 * than one lookaround pair. Requiring only that neither side is a digit also swallowed
 * the comma in `CI 77491, CI 77492`, merging a colour-index run into a single name that
 * could never match.
 */
const SEPARATOR = /(?<!\d),|,(?!\d)|[;\n\r•·，、]+/;

function stripHeadings(text: string): string {
  const first = HEADING.exec(text);
  const body = first
    ? text.slice(first.index + first[0].length)
    : text.replace(LEADING_HEADING, '');
  return body.replace(HEADINGS, '\n');
}

/** Splits a printed list into individual names, in printed order. */
export function parseIngredientList(label: string): string[] {
  return stripHeadings(label.replace(INVISIBLE, ''))
    .replace(MAY_CONTAIN_BLOCK, ',$1,')
    .replace(MAY_CONTAIN_MARKER, ',')
    .split(SEPARATOR)
    .map((part) =>
      part
        .replace(LEADING_NOISE, '')
        .replace(TRAILING_NOISE, '')
        .replace(TRAILING_PERCENT, '')
        .replace(TRAILING_NOISE, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((part) => part.length > 0);
}
