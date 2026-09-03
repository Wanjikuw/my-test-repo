/**
 * Corroborates the hand-transcribed Annex III dataset against independent EU identity
 * sources, matching primarily on CAS number.
 *
 * Why: the 62 entries were transcribed by hand from the regulation text. A wrong CAS digit
 * is invisible until it silently fails to match a real product label. The check that
 * matters is not "how many matched" but "did any entry resolve to a DIFFERENT substance",
 * which is the error a manual transcription actually produces.
 *
 * Sources are complementary, so coverage is reported as a union:
 *   --glossary  EU Glossary of Common Ingredient Names (Decision 96/335/EC)
 *   --norman    NORMAN merged cosmetic products set, itself derived from
 *               Decision 2006/257/EC and the SCCNFP INCI 2000 inventory
 *
 * NEITHER source is authoritative for restriction status. Both predate Regulation (EC)
 * No 1223/2009. They establish identity (name / CAS / structure) only.
 *
 * Usage: tsx src/db/seed/validate-identity.ts --glossary <csv> [--norman <csv>]
 */
import { readFileSync } from 'node:fs';
import { curatedFragranceAllergens } from './curated-risk-data';
import { headerIndex, parseCsv } from './lib/csv';

/** Source names carry stray hyphens and double spaces from the OJ typesetting. */
const norm = (s: string) => s.toLowerCase().replace(/-\s+/g, '').replace(/\s+/g, ' ').trim();

/** NORMAN stores CAS as "CAS_RN: 100-52-7"; the glossary stores bare, sometimes "/"-joined. */
const splitCas = (raw: string): string[] =>
  raw
    .replace(/CAS_RN:\s*/gi, '')
    .split(/[/;]/)
    .map((c) => c.trim())
    .filter((c) => /^\d{2,7}-\d{2}-\d$/.test(c));

interface SourceIndex {
  label: string;
  rows: number;
  byCas: Map<string, string>;
  byName: Map<string, string>;
  annexIIIRefs: number;
  restrictionBlank: number;
}

function indexSource(
  label: string,
  path: string,
  encoding: BufferEncoding,
  nameCol: string,
  casCol: string,
  restrictionCol?: string,
): SourceIndex {
  const rows = parseCsv(readFileSync(path, encoding).replace(/^\uFEFF/, ''));
  const header = rows[0];
  if (!header) throw new Error(`${label}: CSV is empty`);
  const idx = headerIndex(header);

  const iName = idx.get(nameCol);
  const iCas = idx.get(casCol);
  if (iName === undefined || iCas === undefined) {
    throw new Error(`${label}: expected columns "${nameCol}" and "${casCol}"`);
  }
  const iRestr = restrictionCol ? idx.get(restrictionCol) : undefined;

  const byCas = new Map<string, string>();
  const byName = new Map<string, string>();
  let annexIIIRefs = 0;
  let restrictionBlank = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const name = row[iName]?.trim();
    if (name) byName.set(norm(name), name);
    for (const cas of splitCas(row[iCas] ?? '')) {
      if (!byCas.has(cas)) byCas.set(cas, name ?? '');
    }
    if (iRestr !== undefined) {
      const restr = (row[iRestr] ?? '').trim();
      if (restr.includes('III/')) annexIIIRefs++;
      else if (!restr) restrictionBlank++;
    }
  }
  return { label, rows: rows.length - 1, byCas, byName, annexIIIRefs, restrictionBlank };
}

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

function main() {
  const glossaryPath = arg('--glossary');
  const normanPath = arg('--norman');
  if (!glossaryPath && !normanPath) {
    console.error('Usage: tsx validate-identity.ts --glossary <csv> [--norman <csv>]');
    process.exit(1);
  }

  const sources: SourceIndex[] = [];
  if (glossaryPath) {
    sources.push(
      indexSource(
        'EU Glossary 96/335/EC',
        glossaryPath,
        'utf-8',
        'INCI name',
        'CAS No',
        'Restriction',
      ),
    );
  }
  if (normanPath) {
    // latin1: the NORMAN export contains non-UTF8 bytes that make grep call it binary.
    sources.push(indexSource('NORMAN cosmetics', normanPath, 'latin1', 'Name', 'CAS_RN'));
  }

  for (const s of sources) {
    console.log(`${s.label}: ${s.rows} rows, ${s.byCas.size} distinct CAS`);
  }
  console.log('');

  const perSource = new Map<string, number>(sources.map((s) => [s.label, 0]));
  const uncorroborated: string[] = [];
  const nameOnly: string[] = [];
  let unionCas = 0;

  for (const e of curatedFragranceAllergens) {
    let hitAny = false;
    for (const s of sources) {
      if (e.casNumbers.some((c) => s.byCas.has(c))) {
        perSource.set(s.label, (perSource.get(s.label) ?? 0) + 1);
        hitAny = true;
      }
    }
    if (hitAny) {
      unionCas++;
      continue;
    }
    const byName = sources.some((s) =>
      [e.inciName, ...e.aliases].some((n) => s.byName.has(norm(n))),
    );
    if (byName) nameOnly.push(`${e.annexEntry}  ${e.inciName}`);
    else uncorroborated.push(`${e.annexEntry}  ${e.inciName}  [${e.casNumbers.join(', ')}]`);
  }

  const total = curatedFragranceAllergens.length;
  for (const s of sources) {
    console.log(`confirmed by CAS in ${s.label.padEnd(22)}: ${perSource.get(s.label)} / ${total}`);
  }
  console.log('');
  console.log(`CORROBORATED BY CAS (union) : ${unionCas} / ${total}`);
  console.log(`matched on name only        : ${nameOnly.length}`);
  console.log(`not corroborated anywhere   : ${uncorroborated.length}`);

  for (const [label, list] of [
    ['name-only matches (weaker evidence, verify manually)', nameOnly],
    ['NOT corroborated by any source', uncorroborated],
  ] as const) {
    if (list.length) {
      console.log('');
      console.log(`${label}:`);
      for (const u of list) console.log(`  ${u}`);
    }
  }

  const glossary = sources.find((s) => s.label.startsWith('EU Glossary'));
  if (glossary) {
    console.log('');
    console.log('why the glossary Restriction column is unusable for Annex III status:');
    console.log(`  rows citing an Annex III entry : ${glossary.annexIIIRefs}`);
    console.log(`  rows with a blank Restriction  : ${glossary.restrictionBlank}`);
    for (const probe of ['Amyl Cinnamal', 'Benzyl Salicylate', 'Benzyl Alcohol']) {
      console.log(`  ${probe.padEnd(20)} present=${glossary.byName.has(norm(probe))}`);
    }
  }
}

main();
