import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { RegulatoryStatus, RiskCategory } from '@allergy-checker/shared';
import type { MatchingContext } from '../matching/context';
import type { IngredientRecord } from '../matching/matcher';
import { normaliseInciName } from '../matching/normalise';
import { loadContextLazily, notFound, parseOrThrow, type LoadContext } from './support';

export const MAX_QUERY_CHARS = 200;
export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 20;

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

const SearchQuery = z.object({
  q: z.string().trim().min(1).max(MAX_QUERY_CHARS).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Searches the matcher's own key space rather than the raw names, so the search box
 * inherits every resolution rule the analyser has: British spellings, common-name
 * inserts and aliases all hit. Anything findable here is therefore matchable there.
 *
 * A linear scan over the keys is deliberate at this corpus size — it is a sub-millisecond
 * walk over an already-resident map. If the glossary grows past six figures this becomes
 * a trigram index in Postgres, not a bigger loop.
 */
export function findIngredients(
  context: MatchingContext,
  query: string | null,
): IngredientRecord[] {
  if (query === null) {
    return [...context.records].sort((a, b) => a.inciName.localeCompare(b.inciName));
  }

  const needle = normaliseInciName(query);
  if (needle.length === 0) return [];

  const hits = new Map<string, { record: IngredientRecord; prefix: boolean }>();
  for (const [key, entry] of context.index.byName) {
    if (!key.includes(needle)) continue;
    const prefix = key.startsWith(needle);
    const seen = hits.get(entry.record.id);
    if (!seen) hits.set(entry.record.id, { record: entry.record, prefix });
    else if (prefix) seen.prefix = true;
  }

  // A name starting with what was typed is what an autocomplete caller meant; a name
  // merely containing it is a weaker guess and sorts below.
  return [...hits.values()]
    .sort(
      (a, b) =>
        Number(b.prefix) - Number(a.prefix) || a.record.inciName.localeCompare(b.record.inciName),
    )
    .map((hit) => hit.record);
}

export function toSummary(record: IngredientRecord): IngredientSummary {
  return {
    id: record.id,
    inciName: record.inciName,
    aliases: record.aliases,
    regulatoryStatus: record.regulatoryStatus,
    riskCategories: record.riskTags.map((tag) => tag.riskCategory),
  };
}

export function toDetail(record: IngredientRecord): IngredientDetail {
  return {
    ...toSummary(record),
    sourceCitation: record.sourceCitation,
    riskTags: record.riskTags.map((tag) => ({
      riskCategory: tag.riskCategory,
      sourceCitation: tag.sourceCitation,
    })),
  };
}

export interface IngredientRouteOptions {
  loadContext?: LoadContext;
}

export async function ingredientRoutes(app: FastifyInstance, options: IngredientRouteOptions = {}) {
  const loadContext = options.loadContext ?? loadContextLazily;

  app.get('/ingredients', async (request) => {
    const { q, limit, offset } = parseOrThrow(SearchQuery, request.query);
    const context = await loadContext();
    const found = findIngredients(context, q ?? null);

    return {
      items: found.slice(offset, offset + limit).map(toSummary),
      total: found.length,
      limit,
      offset,
    };
  });

  app.get('/ingredients/:id', async (request) => {
    const { id } = parseOrThrow(z.object({ id: z.string().uuid() }), request.params);
    const context = await loadContext();
    const record = context.records.find((candidate) => candidate.id === id);
    if (!record) throw notFound(`No ingredient with id ${id}.`);

    return toDetail(record);
  });
}
