/**
 * Measures how much of a real label the corpus can actually read, and what it would take
 * to make `Safe` reachable.
 *
 * The recall work in Section 2d asked a different question — how many products name a
 * substance we hold. This asks the inverse and harder one: how many products name
 * *nothing* we cannot identify. Rule 7 floors any unrecognised token at
 * `UnverifiedCaution`, so a single unknown emollient is enough to deny a clean product a
 * clean verdict, and a corpus of purely risk-bearing substances denies every one.
 *
 * Resolution here runs through the real matcher index rather than substring search, so the
 * figures reflect what `POST /analyze` would actually do, spelling folds and all.
 *
 * Usage: tsx src/db/seed/label-coverage.ts --corpus <cosmetics.csv> --glossary <glossary.csv>
 */
import { readFileSync } from 'node:fs';
import { headerIndex, parseCsv } from './lib/csv';
import { loadMatchingContext } from '../../matching/context';
import { buildIngredientIndex, lookup, type IngredientRecord } from '../../matching/matcher';
import { looseInciName, normaliseInciName, parseIngredientList } from '../../matching/normalise';

/** Rows where the scrape captured marketing copy instead of an ingredient list. */
function isUsable(raw: string): boolean {
  return raw.length >= 40 && !raw.startsWith('visit the') && !raw.startsWith('#name');
}

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

/** Names the EU Glossary establishes the identity of, keyed for matcher-equivalent lookup. */
function readGlossary(path: string): Map<string, { name: string; cas: string[] }> {
  const rows = parseCsv(readFileSync(path, 'utf-8').replace(/^\uFEFF/, ''));
  const header = rows[0];
  if (!header) throw new Error('glossary CSV is empty');
  const idx = headerIndex(header);
  const iName = idx.get('INCI name');
  const iCas = idx.get('CAS No');
  if (iName === undefined) throw new Error('glossary CSV has no "INCI name" column');

  const byKey = new Map<string, { name: string; cas: string[] }>();
  for (let r = 1; r < rows.length; r++) {
    const name = rows[r]?.[iName]?.trim();
    if (!name) continue;
    const key = normaliseInciName(name);
    if (!key || byKey.has(key)) continue;
    const cas = (iCas === undefined ? '' : (rows[r]?.[iCas] ?? ''))
      .split(/[/;]/)
      .map((c) => c.trim())
      .filter((c) => /^\d{2,7}-\d{2}-\d$/.test(c));
    byKey.set(key, { name, cas });
  }
  return byKey;
}

async function main() {
  const corpusPath = arg('--corpus');
  const glossaryPath = arg('--glossary');
  if (!corpusPath || !glossaryPath) {
    console.error(
      'Usage: tsx label-coverage.ts --corpus <cosmetics.csv> --glossary <glossary.csv>',
    );
    process.exit(1);
  }

  const rows = parseCsv(readFileSync(corpusPath, 'utf-8'));
  const header = rows[0];
  if (!header) throw new Error('corpus CSV is empty');
  const ingIdx = header.indexOf('Ingredients');
  if (ingIdx === -1) throw new Error('corpus CSV has no "Ingredients" column');

  const labels: string[][] = [];
  let junk = 0;
  for (let r = 1; r < rows.length; r++) {
    const raw = (rows[r]?.[ingIdx] ?? '').trim();
    if (!raw || !isUsable(raw.toLowerCase())) {
      junk++;
      continue;
    }
    const names = parseIngredientList(raw);
    if (names.length > 0) labels.push(names);
  }

  const context = await loadMatchingContext();
  const glossary = readGlossary(glossaryPath);

  const resolvedBy = (index: ReturnType<typeof buildIngredientIndex>) => {
    let tokens = 0;
    let resolved = 0;
    let cleanProducts = 0;
    const unresolved = new Map<string, number>();

    for (const names of labels) {
      let allResolved = true;
      for (const name of names) {
        tokens++;
        if (lookup(index, name)) resolved++;
        else {
          allResolved = false;
          const key = normaliseInciName(name);
          unresolved.set(key, (unresolved.get(key) ?? 0) + 1);
        }
      }
      if (allResolved) cleanProducts++;
    }
    return { tokens, resolved, cleanProducts, unresolved };
  };

  const before = resolvedBy(context.index);

  console.log(`corpus rows              : ${rows.length - 1}`);
  console.log(`usable ingredient lists  : ${labels.length}  (${junk} unusable)`);
  console.log(`seeded ingredients       : ${context.records.length}`);
  console.log(`glossary identities      : ${glossary.size}`);
  console.log('');
  console.log('--- what the corpus can read today ---');
  console.log(`label tokens             : ${before.tokens}`);
  console.log(
    `resolved                 : ${before.resolved} (${((before.resolved / before.tokens) * 100).toFixed(1)}%)`,
  );
  console.log(`distinct unresolved names: ${before.unresolved.size}`);
  console.log(
    `products with nothing unknown: ${before.cleanProducts} of ${labels.length} ` +
      `(${((before.cleanProducts / labels.length) * 100).toFixed(1)}%)  <- Safe is only reachable here`,
  );

  const ranked = [...before.unresolved.entries()].sort((a, b) => b[1] - a[1]);
  const confirmed = ranked.filter(([key]) => glossary.has(key));
  const unconfirmed = ranked.filter(([key]) => !glossary.has(key));

  console.log('');
  console.log('--- of the unresolved names ---');
  console.log(`in the EU Glossary       : ${confirmed.length}`);
  console.log(`not in the EU Glossary   : ${unconfirmed.length}  (would have to be invented)`);

  console.log('');
  console.log('--- top 20 unresolved, by how many products name them ---');
  for (const [key, n] of ranked.slice(0, 20)) {
    console.log(
      `  ${String(n).padStart(4)}  ${glossary.has(key) ? 'glossary' : '   --   '}  ${key}`,
    );
  }

  const syntheticFrom = (entries: [string, number][]): IngredientRecord[] =>
    entries.map(([key], i) => ({
      id: `identity-${i}`,
      inciName: glossary.get(key)?.name ?? key,
      aliases: [],
      regulatoryStatus: 'none' as const,
      sourceCitation: 'EU Glossary',
      riskTags: [],
    }));

  console.log('');
  console.log('--- if the top N glossary-confirmed names were seeded ---');
  console.log('     N   tokens read   products with nothing unknown');
  for (const n of [100, 250, 500, 1000, confirmed.length]) {
    const take = confirmed.slice(0, n);
    const index = buildIngredientIndex([...context.records, ...syntheticFrom(take)]);
    const after = resolvedBy(index);
    console.log(
      `  ${String(n).padStart(4)}   ${((after.resolved / after.tokens) * 100).toFixed(1).padStart(5)}%        ` +
        `${String(after.cleanProducts).padStart(4)}  (${((after.cleanProducts / labels.length) * 100).toFixed(1)}%)`,
    );
  }

  // How far the long tail runs. If a handful of names carried most occurrences, identity
  // coverage would be a small job; if it takes thousands, it is a different project.
  const totalUnresolvedTokens = ranked.reduce((sum, [, n]) => sum + n, 0);
  console.log('');
  console.log('--- distinct names needed to read a given share of the unresolved tokens ---');
  for (const target of [0.5, 0.75, 0.9, 0.95, 0.99]) {
    let running = 0;
    let count = 0;
    for (const [, n] of ranked) {
      running += n;
      count++;
      if (running / totalUnresolvedTokens >= target) break;
    }
    console.log(
      `  ${(target * 100).toFixed(0).padStart(3)}%  needs ${String(count).padStart(5)} names`,
    );
  }

  // Per-product counts matter more than the token percentage: `Safe` needs every token on
  // one label to resolve, so an average has no say in whether any product qualifies.
  const unknownsPerProduct = (index: ReturnType<typeof buildIngredientIndex>): number[] =>
    labels.map((names) => names.filter((n) => !lookup(index, n)).length);

  const describe = (label: string, counts: number[]) => {
    const sorted = [...counts].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    const atMost = (k: number) => counts.filter((c) => c <= k).length;
    console.log(
      `  ${label.padEnd(28)} median ${String(median).padStart(3)}   ` +
        `0 unknown: ${String(atMost(0)).padStart(4)}   <=1: ${String(atMost(1)).padStart(4)}   ` +
        `<=3: ${String(atMost(3)).padStart(4)}`,
    );
  };

  console.log('');
  console.log(`--- unknown names per product (of ${labels.length}) ---`);
  describe('today', unknownsPerProduct(context.index));
  describe(
    `+ all ${confirmed.length} glossary names`,
    unknownsPerProduct(buildIngredientIndex([...context.records, ...syntheticFrom(confirmed)])),
  );
  for (const n of [500, 1000, 2000]) {
    describe(
      `+ top ${n} names, any source`,
      unknownsPerProduct(
        buildIngredientIndex([...context.records, ...syntheticFrom(ranked.slice(0, n))]),
      ),
    );
  }
  describe(
    `+ all ${ranked.length} names, any source`,
    unknownsPerProduct(buildIngredientIndex([...context.records, ...syntheticFrom(ranked)])),
  );

  // A derived key that lands on an existing exact key would let a bulk import shadow a
  // cited Annex entry, and which one won would depend on row order.
  const existingExact = new Set(
    context.records.flatMap((r) => [r.inciName, ...r.aliases]).map(normaliseInciName),
  );
  const collisions = confirmed
    .map(([key]) => glossary.get(key)?.name ?? key)
    .filter(
      (name) =>
        existingExact.has(normaliseInciName(name)) || existingExact.has(looseInciName(name)),
    );
  console.log('');
  console.log(`exact-key collisions with the seeded corpus: ${collisions.length}`);
  for (const c of collisions.slice(0, 10)) console.log(`  ${c}`);

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
