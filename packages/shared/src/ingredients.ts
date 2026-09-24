import type { RegulatoryStatus, RiskCategory } from './scoring';

/**
 * The wire contract for `GET /ingredients` and `GET /ingredients/:id`, shared so the API
 * and the web app cannot drift. Response shapes only: the query is validated server-side,
 * where the limits live.
 */

export interface IngredientSummary {
  id: string;
  inciName: string;
  aliases: string[];
  regulatoryStatus: RegulatoryStatus;
  riskCategories: RiskCategory[];
}

export interface IngredientDetail extends IngredientSummary {
  sourceCitation: string;
  /** One citation per tag: the evidence that a substance exists and that it is risky differ. */
  riskTags: { riskCategory: RiskCategory; sourceCitation: string }[];
}

/**
 * `total` is the size of the whole result set, not of `items`. The search box reports it
 * so a caller who sees eight rows is told when there were four hundred behind them.
 */
export interface IngredientSearchResponse {
  items: IngredientSummary[];
  total: number;
  limit: number;
  offset: number;
}
