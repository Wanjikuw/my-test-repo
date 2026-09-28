import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type {
  IngredientDetail,
  IngredientSearchResponse,
  IngredientSummary,
} from '@allergy-checker/shared';
import type { MatchingContext } from '../matching/context';
import type { IngredientRecord } from '../matching/matcher';
import { normaliseInciName } from '../matching/normalise';
import { loadContextLazily, notFound, parseOrThrow, type LoadContext } from './support';

export const MAX_QUERY_CHARS = 200;
export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 20;

const SearchQuery = z.object({
  q: z.string().trim().min(1).max(MAX_QUERY_CHARS).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).default(0),
});

const CONTAINS_HIT = 1;
const PREFIX_HIT = 2;

/**
 * Searches the matcher's own key space rather than the raw names, so the search box
 * inherits every resolution rule the analyser has: British spellings, common-name
 * inserts and aliases all hit. Anything findable here is therefore matchable there.
 *
 * O(keys + records) and no sort. Each hit marks its record's rank — its place in the
 * name-ordered corpus — as a prefix or a contains hit, and one walk over the marks yields
 * the ranked result directly: a name starting with what was typed is what an autocomplete
 * caller meant, and one merely containing it is a weaker guess. If the glossary grows past
 * six figures this becomes a trigram index in Postgres, not a bigger loop.
 */
export function findIngredients(
  context: MatchingContext,
  query: string | null,
): IngredientRecord[] {
  if (query === null) return context.records;

  const needle = normaliseInciName(query);
  if (needle.length === 0) return [];

  const { byName, records } = context.index;
  const marks = new Uint8Array(records.length);
  for (const [key, entry] of byName) {
    if (!key.includes(needle)) continue;
    if (key.startsWith(needle)) marks[entry.rank] = PREFIX_HIT;
    else if (marks[entry.rank] === 0) marks[entry.rank] = CONTAINS_HIT;
  }

  const prefixed: IngredientRecord[] = [];
  const containing: IngredientRecord[] = [];
  for (let rank = 0; rank < marks.length; rank++) {
    if (marks[rank] === PREFIX_HIT) prefixed.push(records[rank]!);
    else if (marks[rank] === CONTAINS_HIT) containing.push(records[rank]!);
  }

  return prefixed.concat(containing);
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

  app.get('/ingredients', async (request): Promise<IngredientSearchResponse> => {
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

  app.get('/ingredients/:id', async (request): Promise<IngredientDetail> => {
    const { id } = parseOrThrow(z.object({ id: z.string().uuid() }), request.params);
    const context = await loadContext();
    const record = context.index.byId.get(id);
    if (!record) throw notFound(`No ingredient with id ${id}.`);

    return toDetail(record);
  });
}
