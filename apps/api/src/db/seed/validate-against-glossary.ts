/**
 * Cross-checks the hand-transcribed Annex III dataset against the EU Glossary of Common
 * Ingredient Names (Decision 96/335/EC), matching on CAS number and INCI name.
 *
 * Purpose is verification only: 62 entries were transcribed by hand from the regulation
 * text, and a wrong CAS digit is invisible until it silently fails to match a real label.
 *
 * The glossary predates Regulation (EC) No 1223/2009, so its Restriction column refers to
 * the old Directive 76/768/EEC annexes. Treat it as authoritative for identity
 * (name/CAS/EC/function) and NOT for current restriction status.
 *
 * Usage: tsx src/db/seed/validate-against-glossary.ts <path-to-EUCOSMETICS csv>
 */
import { readFileSync } from 'node:fs';
import { curatedFragranceAllergens } from './curated-risk-data';

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

/** Glossary names carry stray hyphens and double spaces from the OJ typesetting. */
const norm = (s: string) => s.toLowerCase().replace(/-\s+/g, '').replace(/\s+/g, ' ').trim();

function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: tsx validate-against-glossary.ts <csv>');
    process.exit(1);
  }

  const rows = parseCsv(readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, ''));
  const header = rows[0]?.map((h) => h.trim());
  if (!header) throw new Error('CSV is empty.');
  const iInci = header.indexOf('INCI name');
  const iCas = header.indexOf('CAS No');
  const iFn = header.indexOf('Function');
  const iRestr = header.indexOf('Restriction');

  const byCas = new Map<string, string[]>();
  const byName = new Map<string, string[]>();
  let annexIIIRows = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const inci = row?.[iInci];
    if (!row || !inci) continue;
    byName.set(norm(inci), row);
    for (const cas of (row[iCas] ?? '').split('/')) {
      const c = cas.trim();
      if (c) byCas.set(c, row);
    }
    if ((row[iRestr] ?? '').includes('III/')) annexIIIRows++;
  }

  let casMatched = 0;
  let nameOnly = 0;
  const unmatched: string[] = [];

  for (const e of curatedFragranceAllergens) {
    const casHit = e.casNumbers.find((c) => byCas.has(c));
    if (casHit) {
      casMatched++;
      continue;
    }
    const nameHit = [e.inciName, ...e.aliases].find((n) => byName.has(norm(n)));
    if (nameHit) {
      nameOnly++;
      continue;
    }
    unmatched.push(`${e.annexEntry}  ${e.inciName}  [${e.casNumbers.join(', ')}]`);
  }

  console.log(`glossary rows                : ${rows.length - 1}`);
  console.log(`rows with an Annex III restriction reference: ${annexIIIRows}`);
  console.log(`distinct CAS numbers indexed : ${byCas.size}`);
  console.log('');
  console.log(`our entries confirmed by CAS : ${casMatched} / ${curatedFragranceAllergens.length}`);
  console.log(`confirmed by name only       : ${nameOnly}`);
  console.log(`not found in glossary        : ${unmatched.length}`);
  if (unmatched.length) {
    console.log('');
    console.log('entries absent from the 1996 glossary (expected for substances added later):');
    for (const u of unmatched) console.log(`  ${u}`);
  }
  console.log('');
  console.log(`sample function values: ${iFn === -1 ? 'n/a' : (rows[1]?.[iFn] ?? 'n/a')}`);
}

main();
