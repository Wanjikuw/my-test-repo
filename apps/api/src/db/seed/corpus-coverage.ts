/**
 * Measures how much of a real product corpus our Annex III dataset actually covers.
 *
 * Exists because "entries 67-92 are missing" is an abstract claim until it is counted
 * against real labels. The number this prints belongs in the report as the stated
 * recall limitation.
 *
 * Usage: tsx src/db/seed/corpus-coverage.ts <path-to-cosmetics.csv>
 */
import { readFileSync } from 'node:fs';
import { curatedFragranceAllergens } from './curated-risk-data';

/** Minimal RFC4180-ish parser; the ingredient column is quoted and full of commas. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Fragrance allergens that are routinely individually labelled but are NOT in our
 * dataset, because 2023/1545 left their Annex III entries untouched and an amending act
 * only reproduces what it changes. Used to size the gap, not to score anything.
 */
const KNOWN_UNCOVERED = [
  'linalool',
  'geraniol',
  'eugenol',
  'coumarin',
  'cinnamal',
  'benzyl salicylate',
  'benzyl benzoate',
  'benzyl cinnamate',
  'hexyl cinnamal',
  'amyl cinnamal',
  'amylcinnamyl alcohol',
  'cinnamyl alcohol',
  'anise alcohol',
  'alpha-isomethyl ionone',
  'butylphenyl methylpropional',
  'farnesol',
  'hydroxycitronellal',
  'methyl 2-octynoate',
  'evernia prunastri',
  'evernia furfuracea',
];

function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: tsx corpus-coverage.ts <path-to-cosmetics.csv>');
    process.exit(1);
  }

  const rows = parseCsv(readFileSync(csvPath, 'utf-8'));
  const header = rows[0];
  if (!header) throw new Error('CSV is empty.');
  const ingIdx = header.indexOf('Ingredients');
  const labelIdx = header.indexOf('Label');
  if (ingIdx === -1) throw new Error('No Ingredients column found.');

  // Longest-first so 'benzyl salicylate' is not shadowed by a shorter overlapping term.
  const covered = curatedFragranceAllergens
    .flatMap((e) => [e.inciName, ...e.aliases])
    .map((n) => n.toLowerCase())
    .sort((a, b) => b.length - a.length);

  let usable = 0;
  let junk = 0;
  const productsWithCovered = new Set<number>();
  const productsWithUncovered = new Set<number>();
  const coveredHits = new Map<string, number>();
  const uncoveredHits = new Map<string, number>();

  for (let r = 1; r < rows.length; r++) {
    const raw = (rows[r]?.[ingIdx] ?? '').toLowerCase();
    // Rows where the scrape captured marketing copy instead of a real ingredient list.
    if (!raw || raw.length < 40 || raw.startsWith('visit the') || raw.startsWith('#name')) {
      junk++;
      continue;
    }
    usable++;

    for (const term of covered) {
      if (raw.includes(term)) {
        productsWithCovered.add(r);
        coveredHits.set(term, (coveredHits.get(term) ?? 0) + 1);
      }
    }
    for (const term of KNOWN_UNCOVERED) {
      if (raw.includes(term)) {
        productsWithUncovered.add(r);
        uncoveredHits.set(term, (uncoveredHits.get(term) ?? 0) + 1);
      }
    }
  }

  const onlyUncovered = [...productsWithUncovered].filter((i) => !productsWithCovered.has(i));

  const top = (m: Map<string, number>, n: number) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

  console.log(`corpus rows            : ${rows.length - 1}`);
  console.log(`usable ingredient lists: ${usable}`);
  console.log(`unusable (marketing/#NAME?/blank): ${junk}`);
  console.log(`labels of type         : ${labelIdx === -1 ? 'n/a' : 'see Label column'}`);
  console.log('');
  console.log(`products matching our 62 seeded entries : ${productsWithCovered.size}`);
  console.log(`products carrying a known-uncovered one : ${productsWithUncovered.size}`);
  console.log(`products we would MISS ENTIRELY         : ${onlyUncovered.length}`);
  console.log('');
  console.log('top covered hits:');
  for (const [t, c] of top(coveredHits, 10)) console.log(`  ${c.toString().padStart(4)}  ${t}`);
  console.log('');
  console.log('top uncovered hits (the recall gap):');
  for (const [t, c] of top(uncoveredHits, 10)) console.log(`  ${c.toString().padStart(4)}  ${t}`);
}

main();
