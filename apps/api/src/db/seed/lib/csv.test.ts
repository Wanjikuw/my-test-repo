import { describe, expect, it } from 'vitest';
import { headerIndex, parseCsv } from './csv';

describe('parseCsv', () => {
  it('splits plain rows', () => {
    expect(parseCsv('a,b\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('keeps commas inside quoted fields', () => {
    expect(parseCsv('a,b\n"1,5",2\n')).toEqual([
      ['a', 'b'],
      ['1,5', '2'],
    ]);
  });

  it('unescapes doubled quotes', () => {
    expect(parseCsv('"say ""hi""",b\n')).toEqual([['say "hi"', 'b']]);
  });

  it('keeps newlines inside quoted fields', () => {
    expect(parseCsv('"line1\nline2",b\n')).toEqual([['line1\nline2', 'b']]);
  });

  it('emits a final row that has no trailing newline', () => {
    expect(parseCsv('a,b')).toEqual([['a', 'b']]);
  });

  it('preserves empty trailing fields', () => {
    expect(parseCsv('a,,c\n')).toEqual([['a', '', 'c']]);
  });
});

describe('headerIndex', () => {
  it('trims header whitespace', () => {
    const idx = headerIndex(['NORMAN_ID ', 'Name', ' CAS_RN']);
    expect(idx.get('NORMAN_ID')).toBe(0);
    expect(idx.get('CAS_RN')).toBe(2);
  });
});
