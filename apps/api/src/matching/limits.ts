/**
 * The longest string that can be an ingredient name. Real INCI names are far shorter, and the
 * API already refuses a longer `inciNames` entry or declared allergy. A longer printed name is
 * a pasted paragraph or junk: it is reported as unrecognised and never looked up, which also
 * bounds the cost of everything that scans a single name.
 */
export const MAX_NAME_CHARS = 200;

/**
 * The most slash-separated parts treated as one ingredient printed under several names, as in
 * `Aqua/Water/Eau`. A name with more slashes than this is not a list of synonyms, and
 * expanding it would let one printed name stand for thousands of unrecognised entries.
 */
export const MAX_ALTERNATE_PARTS = 8;
