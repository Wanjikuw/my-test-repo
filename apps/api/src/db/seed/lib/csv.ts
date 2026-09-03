/**
 * Minimal RFC 4180 reader. Shared by the seed analysis scripts.
 *
 * Hand-rolled rather than pulled from npm because the analysis scripts must run against
 * regulator PDFs-turned-CSV with inconsistent quoting, and a parser bug would silently
 * skew the coverage figures reported in the dissertation.
 */
export function parseCsv(text: string): string[][] {
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

/** Builds a column-name -> index lookup, tolerating stray whitespace in the header. */
export function headerIndex(header: readonly string[]): Map<string, number> {
  const map = new Map<string, number>();
  header.forEach((h, i) => map.set(h.trim(), i));
  return map;
}
