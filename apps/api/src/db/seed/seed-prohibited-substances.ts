/**
 * Seeds the `ingredients` table with substances PROHIBITED under Annex II.
 *
 * These rows deliberately get no risk tag. "Banned" is a regulatory status, not a reason
 * a substance is risky to a particular person, and rubric Section 2f requires the engine
 * to keep Annex II and Annex III apart rather than collapsing them into one status.
 *
 * Usage: tsx src/db/seed/seed-prohibited-substances.ts
 */
import { db } from '../client';
import { ingredients } from '../schema';
import { prohibitedSubstances, regulatoryStatusFor } from './prohibited-substances';

async function main() {
  let seeded = 0;

  for (const substance of prohibitedSubstances) {
    const regulatoryStatus = regulatoryStatusFor(substance);

    const [inserted] = await db
      .insert(ingredients)
      .values({
        inciName: substance.name,
        aliases: substance.aliases,
        regulatoryStatus,
        sourceCitation: substance.sourceCitation,
      })
      .onConflictDoNothing({ target: ingredients.inciName })
      .returning();

    // A collision means an existing row — almost certainly an Annex III entry — is about
    // to be relabelled as banned. Refuse rather than overwrite; the annexes are not
    // interchangeable, and dual-status substances are separate preparations.
    if (!inserted) {
      console.warn(`Skipped ${substance.name}: an ingredient with that name already exists.`);
      continue;
    }

    seeded++;
    console.log(`Seeded ${substance.name} (${regulatoryStatus})`);
  }

  console.log(`Done. ${seeded} of ${prohibitedSubstances.length} prohibited substances seeded.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
