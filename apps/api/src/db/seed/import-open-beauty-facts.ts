/**
 * Imports the Open Beauty Facts CSV, filtered to skincare-relevant categories with a
 * populated ingredients_text field — per the measured count in the rubric doc (Section 2b),
 * this yields 1,489 usable rows out of 64,237 total. DO NOT import the full unfiltered file.
 *
 * Usage: tsx src/db/seed/import-open-beauty-facts.ts /path/to/en_openbeautyfacts_org_products.csv
 *        tsx src/db/seed/import-open-beauty-facts.ts <csv> --dry-run
 *
 * `--dry-run` counts what the filter would import without opening a database connection,
 * which is how the row count in the rubric is re-verified.
 *
 * This script only creates `products` rows and best-effort splits `ingredients_text`
 * into candidate ingredient name strings — it does NOT create `ingredients` rows itself.
 * Matching those candidate strings against the canonical `ingredients` table (seeded
 * separately from CosIng + curated-risk-data.ts) is Phase 4/5 matching logic, not this
 * script's job. Keep these concerns separate, same as the matching/scoring split in the
 * rubric doc.
 */
import { createReadStream } from 'node:fs';
import readline from 'node:readline';
import { products } from '../schema';

const SKINCARE_KEYWORDS = [
  'skin care',
  'skincare',
  'face care',
  'cream',
  'lotion',
  'serum',
  'moisturiz',
  'cleanser',
  'sunscreen',
  'toner',
  'exfoliant',
  'facial',
];

function isSkincareCategory(categoriesEn: string): boolean {
  const lower = categoriesEn.toLowerCase();
  return SKINCARE_KEYWORDS.some((k) => lower.includes(k));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const csvPath = args.find((a) => !a.startsWith('--'));
  if (!csvPath) {
    console.error('Usage: tsx import-open-beauty-facts.ts <csv> [--dry-run]');
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: createReadStream(csvPath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let header: string[] | null = null;
  let nameIdx = -1;
  let brandIdx = -1;
  let categoriesIdx = -1;
  let ingredientsIdx = -1;

  let scanned = 0;
  let imported = 0;
  const rowsToInsert: { name: string; brand: string | null; source: string }[] = [];

  for await (const line of rl) {
    const cols = line.split('\t'); // Open Beauty Facts export is tab-delimited

    if (!header) {
      header = cols;
      nameIdx = header.indexOf('product_name');
      brandIdx = header.indexOf('brands');
      categoriesIdx = header.indexOf('categories_en');
      ingredientsIdx = header.indexOf('ingredients_text');
      if ([nameIdx, categoriesIdx, ingredientsIdx].includes(-1)) {
        throw new Error(
          'Expected columns not found — confirm this is the standard Open Beauty Facts export format before running.',
        );
      }
      continue;
    }

    scanned++;
    const categories = cols[categoriesIdx] ?? '';
    const ingredientsText = (cols[ingredientsIdx] ?? '').trim();
    const name = (cols[nameIdx] ?? '').trim();

    if (!name || !ingredientsText || !isSkincareCategory(categories)) continue;

    rowsToInsert.push({
      name,
      brand: (cols[brandIdx] ?? '').trim() || null,
      source: 'open_beauty_facts',
    });
    imported++;
  }

  console.log(`Scanned ${scanned} rows, ${imported} matched the skincare filter.`);

  if (rowsToInsert.length === 0) {
    console.log('Nothing to insert.');
    return;
  }

  if (dryRun) {
    console.log('Dry run — no database connection opened, nothing inserted.');
    return;
  }

  // Imported here rather than at module scope so --dry-run works without DATABASE_URL.
  const { db } = await import('../client');

  // Batch insert in chunks to avoid one giant query
  const CHUNK = 500;
  for (let i = 0; i < rowsToInsert.length; i += CHUNK) {
    await db.insert(products).values(rowsToInsert.slice(i, i + CHUNK));
  }

  console.log(`Inserted ${rowsToInsert.length} product rows.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
