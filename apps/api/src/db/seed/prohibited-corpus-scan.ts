/**
 * Scans a product corpus for substances PROHIBITED under Annex II.
 *
 * A hit means the product is non-compliant, not merely risky, so this is reported
 * separately from the Annex III coverage figures.
 *
 * Usage: tsx src/db/seed/prohibited-corpus-scan.ts <path-to-cosmetics.csv>
 */
import { readFileSync } from 'node:fs';
import { headerIndex, parseCsv } from './lib/csv';
import { prohibitedSubstances } from './prohibited-substances';

function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: tsx prohibited-corpus-scan.ts <csv>');
    process.exit(1);
  }

  const rows = parseCsv(readFileSync(csvPath, 'utf-8'));
  const header = rows[0];
  if (!header) throw new Error('CSV is empty.');
  const idx = headerIndex(header);
  const ingIdx = idx.get('Ingredients');
  const nameIdx = idx.get('Name');
  const brandIdx = idx.get('Brand');
  if (ingIdx === undefined) throw new Error('No Ingredients column found.');

  const terms = prohibitedSubstances.flatMap((s) =>
    [s.name, ...s.aliases]
      .map((n) => n.toLowerCase())
      // Long regulatory names never appear verbatim on a label; alias matching carries these.
      .filter((n) => n.length > 3 && !n.includes('(') && !n.includes(','))
      .map((n) => ({ term: n, entry: s.annexIIEntry, label: s.aliases[0] ?? s.name })),
  );

  const hits = new Map<string, { entry: number; products: string[] }>();
  let usable = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const raw = (row?.[ingIdx] ?? '').toLowerCase();
    if (!raw || raw.length < 40 || raw.startsWith('visit the') || raw.startsWith('#name')) continue;
    usable++;
    for (const { term, entry, label } of terms) {
      if (!raw.includes(term)) continue;
      const bucket = hits.get(label) ?? { entry, products: [] };
      if (bucket.products.length < 3) {
        bucket.products.push(`${row?.[brandIdx ?? -1] ?? '?'} — ${row?.[nameIdx ?? -1] ?? '?'}`);
      }
      hits.set(label, bucket);
    }
  }

  console.log(`usable ingredient lists : ${usable}`);
  console.log(`prohibited terms searched: ${terms.length}`);
  console.log(`distinct substances hit  : ${hits.size}`);
  if (hits.size === 0) {
    console.log('');
    console.log('No Annex II substance found. Expected: this corpus is US retail data, and');
    console.log('these substances are banned in the EU, so absence is the compliant outcome.');
    return;
  }
  console.log('');
  for (const [label, { entry, products }] of hits) {
    console.log(`  Annex II entry ${entry} — ${label}`);
    for (const p of products) console.log(`      ${p}`);
  }
}

main();
