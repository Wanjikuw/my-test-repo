/**
 * Seeds the `ingredients` and `ingredient_risk_tags` tables from the curated
 * fragrance-allergen, preservative-sensitizer, comedogenic, irritant and photosensitiser
 * lists. This is the starting point of the canonical ingredients table — CosIng ingestion
 * (identity/function for the full ingredient universe) is a separate, larger script still
 * to be written; this one covers the risk-tagged subset so scoring logic has real data to
 * test against early.
 *
 * Written as bulk statements rather than a row-at-a-time loop. The previous version issued
 * up to three round trips per entry, which over a pooled connection took minutes and was
 * long enough that an interrupted run could leave the table half seeded.
 *
 * Usage: tsx src/db/seed/seed-curated-risk-data.ts
 */
import { inArray, sql } from 'drizzle-orm';
import { db } from '../client';
import { ingredients, ingredientRiskTags } from '../schema';
import {
  curatedFragranceAllergens,
  curatedPreservativeSensitizers,
  curatedComedogenicIngredients,
  curatedCommonIrritants,
  curatedPhotosensitizers,
  repealedAnnexEntries,
  deletedFragranceAllergenEntries,
} from './curated-risk-data';

/**
 * Postgres caps a statement at 65535 bound parameters. Five columns per ingredient leaves
 * plenty of headroom at this size, and it keeps the ceiling explicit for when the corpus
 * grows by two orders of magnitude.
 */
const CHUNK_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

async function main() {
  const allEntries = [
    ...curatedFragranceAllergens,
    ...curatedPreservativeSensitizers,
    ...curatedComedogenicIngredients,
    ...curatedCommonIrritants,
    ...curatedPhotosensitizers,
  ];

  const blocked = [
    ...repealedAnnexEntries,
    ...deletedFragranceAllergenEntries.map((d) => d.annexEntry),
  ];
  const revived = allEntries.filter((e) => blocked.includes(e.annexEntry));
  if (revived.length > 0) {
    throw new Error(
      `Refusing to seed repealed Annex III entries: ${revived.map((e) => `${e.inciName} (${e.annexEntry})`).join(', ')}`,
    );
  }

  // One INSERT cannot carry the same conflict target twice, and a duplicate would in any
  // case mean two curated lists disagree about one substance.
  const byName = new Map<string, (typeof allEntries)[number]>();
  for (const entry of allEntries) {
    if (byName.has(entry.inciName)) {
      console.warn(`Duplicate curated entry ignored: ${entry.inciName}`);
      continue;
    }
    byName.set(entry.inciName, entry);
  }
  const entries = [...byName.values()];

  let insertedCount = 0;
  for (const batch of chunk(entries, CHUNK_SIZE)) {
    const rows = await db
      .insert(ingredients)
      .values(
        batch.map((entry) => ({
          inciName: entry.inciName,
          aliases: entry.aliases,
          // Annex III entries are restricted by virtue of their entry number. Anything
          // governed by another annex has to say so: Annex V and Annex II carry their own
          // numbering, and a comedogenic or irritant entry has no provision at all.
          regulatoryStatus:
            entry.regulatoryStatus ??
            (entry.annexEntry > 0 ? ('restricted' as const) : ('none' as const)),
          sourceCitation: entry.sourceCitation,
        })),
      )
      // Was onConflictDoNothing, which made the seeder incapable of carrying a correction:
      // a corrigendum could be transcribed, committed and reviewed, and the row it fixed
      // would keep its old citation forever. The repo is the source of truth per rubric §5,
      // so it overwrites the columns it owns and leaves the rest alone.
      .onConflictDoUpdate({
        target: ingredients.inciName,
        set: {
          aliases: sql`excluded.aliases`,
          regulatoryStatus: sql`excluded.regulatory_status`,
          sourceCitation: sql`excluded.source_citation`,
        },
      })
      .returning({ id: ingredients.id });
    insertedCount += rows.length;
  }

  // Ids are read back for every entry, not just the newly inserted ones: a re-run inserts
  // nothing yet still has to attach tags to rows that already existed.
  const idByName = new Map<string, string>();
  for (const batch of chunk(entries, CHUNK_SIZE)) {
    const rows = await db
      .select({ id: ingredients.id, inciName: ingredients.inciName })
      .from(ingredients)
      .where(
        inArray(
          ingredients.inciName,
          batch.map((e) => e.inciName),
        ),
      );
    for (const row of rows) idByName.set(row.inciName, row.id);
  }

  const tagRows = [];
  for (const entry of entries) {
    const ingredientId = idByName.get(entry.inciName);
    if (!ingredientId) {
      console.warn(`Could not resolve id for ${entry.inciName}, skipping risk tag.`);
      continue;
    }
    tagRows.push({
      ingredientId,
      riskCategory: entry.riskCategory,
      sourceCitation: entry.sourceCitation,
      notes: entry.notes ?? null,
    });
  }

  let tagCount = 0;
  for (const batch of chunk(tagRows, CHUNK_SIZE)) {
    const rows = await db
      .insert(ingredientRiskTags)
      .values(batch)
      .onConflictDoUpdate({
        target: [ingredientRiskTags.ingredientId, ingredientRiskTags.riskCategory],
        set: {
          sourceCitation: sql`excluded.source_citation`,
          notes: sql`excluded.notes`,
        },
      })
      .returning({ id: ingredientRiskTags.id });
    tagCount += rows.length;
  }

  const statements = chunk(entries, CHUNK_SIZE).length * 2 + chunk(tagRows, CHUNK_SIZE).length;
  console.log(
    `Done. ${entries.length} curated entries processed in ${statements} statements: ` +
      `${insertedCount} ingredient rows written, ${tagCount} risk tags written. ` +
      `Writes are upserts, so a re-run restates every row from this repo.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
