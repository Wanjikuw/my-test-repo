import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { ingredients, ingredientRiskTags, skinTypeSensitivity } from '../db/schema';
import {
  buildIngredientIndex,
  type IngredientIndex,
  type IngredientRecord,
  type SensitivityRule,
} from './matcher';

/**
 * The ingredient index is expensive to build relative to using it — hundreds of
 * milliseconds at a full-glossary corpus, against sub-millisecond lookups — so it is
 * built once and reused. Rebuilding per request would dominate response time and would
 * scale with the corpus, which is exactly the wrong direction.
 */
export interface MatchingContext {
  index: IngredientIndex;
  rules: SensitivityRule[];
  ingredientCount: number;
  loadedAt: Date;
}

/** Shape drizzle returns for the ingredients-to-tags left join. */
export interface JoinedRow {
  ingredients: {
    id: string;
    inciName: string;
    aliases: string[];
    regulatoryStatus: IngredientRecord['regulatoryStatus'];
    sourceCitation: string;
  };
  ingredient_risk_tags: {
    riskCategory: IngredientRecord['riskTags'][number]['riskCategory'];
    sourceCitation: string;
  } | null;
}

/**
 * Collapses the join back into one record per ingredient. A left join is used so an
 * ingredient with no risk tag still appears — dropping those would make an untagged
 * ingredient indistinguishable from one we have never heard of.
 */
export function collateRecords(rows: JoinedRow[]): IngredientRecord[] {
  const byId = new Map<string, IngredientRecord>();

  for (const row of rows) {
    const i = row.ingredients;
    let record = byId.get(i.id);
    if (!record) {
      record = {
        id: i.id,
        inciName: i.inciName,
        aliases: i.aliases,
        regulatoryStatus: i.regulatoryStatus,
        sourceCitation: i.sourceCitation,
        riskTags: [],
      };
      byId.set(i.id, record);
    }

    const tag = row.ingredient_risk_tags;
    if (tag) {
      record.riskTags.push({
        riskCategory: tag.riskCategory,
        sourceCitation: tag.sourceCitation,
      });
    }
  }

  return [...byId.values()];
}

let cached: MatchingContext | null = null;
let inflight: Promise<MatchingContext> | null = null;

async function refresh(): Promise<MatchingContext> {
  const rows = await db
    .select()
    .from(ingredients)
    .leftJoin(ingredientRiskTags, eq(ingredientRiskTags.ingredientId, ingredients.id));

  const records = collateRecords(rows as JoinedRow[]);
  const rules = (await db.select().from(skinTypeSensitivity)) as SensitivityRule[];

  return {
    index: buildIngredientIndex(records),
    rules,
    ingredientCount: records.length,
    loadedAt: new Date(),
  };
}

/**
 * Returns the cached context, loading it on first use.
 *
 * Concurrent callers share one in-flight load. Without that, a cold start under load
 * would fire a separate full-table read per request.
 */
export function loadMatchingContext(): Promise<MatchingContext> {
  if (cached) return Promise.resolve(cached);

  inflight ??= refresh()
    .then((context) => {
      cached = context;
      return context;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Drops the cache so the next read rebuilds. Call after reseeding. */
export function clearMatchingContext(): void {
  cached = null;
}

/** Present only if a load has completed; does not trigger one. */
export function peekMatchingContext(): MatchingContext | null {
  return cached;
}
