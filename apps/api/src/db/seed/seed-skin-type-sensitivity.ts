/**
 * Seeds `skin_type_sensitivity`, the lookup precedence rule 5 depends on.
 * Until this table has rows, rule 5 can never fire and every skin-type-relevant
 * risk silently scores as Safe.
 *
 * Usage: tsx src/db/seed/seed-skin-type-sensitivity.ts
 */
import { db } from '../client';
import { skinTypeSensitivity } from '../schema';
import { skinTypeSensitivities } from './skin-type-sensitivity';

async function main() {
  let seeded = 0;

  for (const entry of skinTypeSensitivities) {
    const [row] = await db
      .insert(skinTypeSensitivity)
      .values(entry)
      .onConflictDoNothing()
      .returning();

    if (row) seeded++;
    console.log(
      `${row ? 'Seeded' : 'Already present'}: ${entry.skinType} -> ${entry.riskCategory}`,
    );
  }

  console.log(`Done. ${seeded} of ${skinTypeSensitivities.length} rows inserted.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
