import type { IngredientSummary } from '@allergy-checker/shared';
import { CATEGORY_LABEL, STATUS_LABEL } from './annotate';

/**
 * The record, stated as record. An ingredient carrying a tag has not been judged against
 * anyone's profile yet, so this line never says more than what the corpus holds.
 */
export function onRecordLine(item: IngredientSummary): string {
  const parts = [
    STATUS_LABEL[item.regulatoryStatus],
    ...item.riskCategories.map((category) => CATEGORY_LABEL[category]),
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(' · ') : 'No risk on record';
}

/**
 * Which alias the query hit, so a search for `water` returning `AQUA` explains itself.
 * A display hint only — the server decides what actually matches, and re-implementing its
 * normalisation here would be a second opinion the interface has no business holding.
 */
export function matchedAlias(item: IngredientSummary, query: string): string | null {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0 || item.inciName.toLowerCase().includes(needle)) return null;
  return item.aliases.find((alias) => alias.toLowerCase().includes(needle)) ?? null;
}
