/**
 * The label is one piece of text whether it was pasted, photographed or picked from the
 * search, so a manual pick joins it rather than living in a list of its own.
 */

export interface AddResult {
  label: string;
  /** False when the name was already on the label, so the caller can say so rather than no-op. */
  added: boolean;
}

/**
 * Splitting on commas and newlines is deliberately cruder than the API's splitter, which
 * has to cope with commas inside chemical names. Here it only guards a convenience, and
 * the asymmetry is safe: a miss appends a duplicate, while a false hit would need an
 * identical trimmed segment already present — which is a real duplicate.
 */
export function addIngredient(label: string, inciName: string): AddResult {
  const name = inciName.trim();
  const present = label
    .split(/[,\n]/)
    .some((part) => part.trim().toLowerCase() === name.toLowerCase());
  if (present) return { label, added: false };

  const existing = label.trimEnd();
  if (existing.length === 0) return { label: name, added: true };
  return {
    label: existing.endsWith(',') ? `${existing} ${name}` : `${existing}, ${name}`,
    added: true,
  };
}

export interface ReplaceResult {
  label: string;
  /** False when the printed name is no longer on the label, because the user edited it. */
  replaced: boolean;
}

/** What may sit either side of one printed entry, as the API's splitter sees it. */
const DELIMITER = String.raw`[,;\n\r•·/\[\]:，、]`;
const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

/**
 * Substitutes a name the user accepted for one the reference data could not read. Only a
 * whole entry is replaced — `Oil` must not be swapped inside `Coconut Oil` — and runs of
 * whitespace match loosely, because the API collapsed them before reporting the name.
 */
export function replaceName(label: string, printed: string, replacement: string): ReplaceResult {
  const body = printed.trim().replace(REGEX_SPECIAL, '\\$&').replace(/\s+/g, '\\s+');
  if (body.length === 0) return { label, replaced: false };

  const entry = new RegExp(
    `(^|${DELIMITER})(\\s*)${body}(?=\\s*(?:$|${DELIMITER}|[*†‡.(%])|\\s+\\d)`,
    'i',
  );
  const found = entry.exec(label);
  if (!found) return { label, replaced: false };

  const start = found.index + (found[1]?.length ?? 0) + (found[2]?.length ?? 0);
  const end = found.index + found[0].length;
  return { label: label.slice(0, start) + replacement + label.slice(end), replaced: true };
}
