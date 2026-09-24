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
