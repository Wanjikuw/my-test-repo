/**
 * Seeds identity-only ingredients from the EU Glossary of Common Ingredient Names
 * (Commission Decision 96/335/EC).
 *
 * These rows carry no risk tag and `regulatory_status = none`. That is the whole point:
 * the corpus previously held nothing but risk-bearing and prohibited substances, so an
 * ordinary label's water and emollients were indistinguishable from substances we have
 * never heard of, and rule 7 reported both the same way. A recognised-and-unremarkable
 * ingredient is a different fact from an unrecognised one, and the dataset could not say
 * so until now.
 *
 * The Glossary establishes identity only and predates Regulation (EC) No 1223/2009, so it
 * is never a source for risk or for restriction status — Section 2d of the rubric measures
 * exactly how unusable its own `Restriction` column is. Nothing here ever writes a tag.
 *
 * A curated row always wins. Any Glossary name that already resolves against the seeded
 * corpus is skipped before insert, and the upsert is scoped so it can only ever rewrite a
 * row that is already attributed to the Glossary. A bulk identity import must not be able
 * to overwrite a cited Annex entry.
 *
 * Usage: tsx src/db/seed/seed-identity-baseline.ts --glossary <csv> [--dry-run]
 */
import { readFileSync } from 'node:fs';
import { eq, sql } from 'drizzle-orm';
import { ingredients } from '../schema';
import { headerIndex, parseCsv } from './lib/csv';
import { buildIngredientIndex, lookup, type IngredientRecord } from '../../matching/matcher';
import { normaliseInciName } from '../../matching/normalise';

export const GLOSSARY_CITATION =
  'EU Glossary of Common Ingredient Names (Commission Decision 96/335/EC) — identity only; establishes that the name denotes a known cosmetic ingredient, and nothing about its risk';

const CHUNK_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

export interface GlossaryIdentity {
  inciName: string;
}

/**
 * The Glossary is typeset in two narrow columns, so long names are broken across a line
 * with a hyphen and the break survives into the CSV: `ACANTHOPANAX SENTI- COSUS EXTRACT`.
 * Seeding that verbatim stores a name no label will ever print. `validate-identity.ts`
 * applies the same fold, which is what let it corroborate 59 of 62 entries by CAS.
 *
 * Only a hyphen followed by whitespace is joined. A hyphen inside a name — `PEG-8`,
 * `C12-15 ALKYL BENZOATE` — has no space after it and is left alone.
 */
export function repairColumnBreaks(raw: string): string {
  return raw.replace(/-\s+/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Distinct INCI names from the Glossary, deduplicated on the matcher's own key so two
 * spellings of one name cannot become two ingredients.
 *
 * Names are stored as the source prints them, in capitals. The document writes them in
 * title case in its description column for only 1,475 of 7,662 rows, and title-casing the
 * rest mechanically would turn PEG, PVP, EDTA and every other INCI acronym into a word
 * that is simply wrong. An ugly name is recoverable at render time; a wrong one is not.
 */
export function readGlossaryIdentities(csv: string): GlossaryIdentity[] {
  const rows = parseCsv(csv.replace(/^\uFEFF/, ''));
  const header = rows[0];
  if (!header) throw new Error('glossary CSV is empty');
  const iName = headerIndex(header).get('INCI name');
  if (iName === undefined) throw new Error('glossary CSV has no "INCI name" column');

  const byKey = new Map<string, GlossaryIdentity>();
  for (let r = 1; r < rows.length; r++) {
    const name = repairColumnBreaks(rows[r]?.[iName] ?? '');
    if (!name || name.length < 2) continue;
    const key = normaliseInciName(name);
    if (!key || byKey.has(key)) continue;
    byKey.set(key, { inciName: name });
  }
  return [...byKey.values()];
}

/** Glossary names the seeded corpus already resolves, which must keep their citation. */
export function partitionAgainstCorpus(
  identities: GlossaryIdentity[],
  records: IngredientRecord[],
): { fresh: GlossaryIdentity[]; alreadyKnown: GlossaryIdentity[] } {
  const index = buildIngredientIndex(records);
  const fresh: GlossaryIdentity[] = [];
  const alreadyKnown: GlossaryIdentity[] = [];
  for (const identity of identities) {
    if (lookup(index, identity.inciName)) alreadyKnown.push(identity);
    else fresh.push(identity);
  }
  return { fresh, alreadyKnown };
}

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  const glossaryPath = arg('--glossary');
  const dryRun = process.argv.includes('--dry-run');
  if (!glossaryPath) {
    console.error('Usage: tsx seed-identity-baseline.ts --glossary <csv> [--dry-run]');
    process.exit(1);
  }

  const identities = readGlossaryIdentities(readFileSync(glossaryPath, 'utf-8'));
  console.log(`Glossary identities: ${identities.length}`);

  const { loadMatchingContext } = await import('../../matching/context');
  const context = await loadMatchingContext();
  const { fresh, alreadyKnown } = partitionAgainstCorpus(identities, context.records);

  console.log(`Already resolvable, left untouched: ${alreadyKnown.length}`);
  console.log(`New identity rows to write        : ${fresh.length}`);

  if (dryRun) {
    console.log('Dry run — nothing written.');
    return;
  }

  const { db } = await import('../client');
  let written = 0;
  for (const batch of chunk(fresh, CHUNK_SIZE)) {
    const rows = await db
      .insert(ingredients)
      .values(
        batch.map((identity) => ({
          inciName: identity.inciName,
          aliases: [],
          regulatoryStatus: 'none' as const,
          sourceCitation: GLOSSARY_CITATION,
        })),
      )
      .onConflictDoUpdate({
        target: ingredients.inciName,
        set: { sourceCitation: sql`excluded.source_citation` },
        // Only a row already attributed to the Glossary may be rewritten by this script.
        setWhere: eq(ingredients.sourceCitation, GLOSSARY_CITATION),
      })
      .returning({ id: ingredients.id });
    written += rows.length;
  }

  console.log(`Done. ${written} identity rows written, 0 risk tags — by design.`);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
