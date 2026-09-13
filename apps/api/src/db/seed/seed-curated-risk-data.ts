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
import { inArray } from 'drizzle-orm';
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
          // Annex III entries are restricted. The preservative, comedogenic and irritant
          // entries carry annexEntry 0 because no numbered provision applies to them, so
          // they get no regulatory status.
          regulatoryStatus: entry.annexEntry > 0 ? ('restricted' as const) : ('none' as const),
          sourceCitation: entry.sourceCitation,
        })),
      )
      .onConflictDoNothing({ target: ingredients.inciName })
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
      .onConflictDoNothing()
      .returning({ id: ingredientRiskTags.id });
    tagCount += rows.length;
  }

  const statements = chunk(entries, CHUNK_SIZE).length * 2 + chunk(tagRows, CHUNK_SIZE).length;
  console.log(
    `Done. ${entries.length} curated entries processed in ${statements} statements: ` +
      `${insertedCount} ingredients inserted, ${entries.length - insertedCount} already present, ` +
      `${tagCount} risk tags inserted.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
