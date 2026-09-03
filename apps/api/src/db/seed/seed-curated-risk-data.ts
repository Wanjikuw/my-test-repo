/**
 * Seeds the `ingredients` and `ingredient_risk_tags` tables from the curated
 * fragrance-allergen and preservative-sensitizer lists. This is the starting
 * point of the canonical ingredients table — CosIng ingestion (identity/function
 * for the full ingredient universe) is a separate, larger script still to be
 * written; this one covers the risk-tagged subset so scoring logic has real
 * data to test against early.
 *
 * Usage: tsx src/db/seed/seed-curated-risk-data.ts
 */
import { db } from '../client';
import { ingredients, ingredientRiskTags } from '../schema';
import {
  curatedFragranceAllergens,
  curatedPreservativeSensitizers,
  repealedAnnexEntries,
  deletedFragranceAllergenEntries,
} from './curated-risk-data';

async function main() {
  const allEntries = [...curatedFragranceAllergens, ...curatedPreservativeSensitizers];

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

  for (const entry of allEntries) {
    const [ingredient] = await db
      .insert(ingredients)
      .values({
        inciName: entry.inciName,
        aliases: entry.aliases,
        sourceCitation: entry.sourceCitation,
      })
      .onConflictDoNothing({ target: ingredients.inciName })
      .returning();

    // If the ingredient already existed (onConflictDoNothing skipped the insert),
    // fetch its id instead of skipping the risk tag.
    const ingredientId =
      ingredient?.id ??
      (
        await db.query.ingredients.findFirst({
          where: (i, { eq }) => eq(i.inciName, entry.inciName),
        })
      )?.id;

    if (!ingredientId) {
      console.warn(`Could not resolve id for ${entry.inciName}, skipping risk tag.`);
      continue;
    }

    await db
      .insert(ingredientRiskTags)
      .values({
        ingredientId,
        riskCategory: entry.riskCategory,
        sourceCitation: entry.sourceCitation,
        notes: entry.notes ?? null,
      })
      .onConflictDoNothing();

    console.log(`Seeded ${entry.inciName} (${entry.riskCategory})`);
  }

  console.log(`Done. ${allEntries.length} curated entries processed.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
