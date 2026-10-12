import { describe, expect, it } from 'vitest';
import { MAX_LABEL_CHARS } from '../routes/analyze';
import { analyseNames, buildIngredientIndex, type IngredientRecord } from './matcher';
import { parseIngredientList, stripTrailingPercent, trimTrailingNoise } from './normalise';

/**
 * A label has to cost about the same to read whatever it is made of. The API accepts
 * MAX_LABEL_CHARS characters from anyone and Node serves one request at a time, so an input
 * that takes seconds lets one caller stop everyone else being served. The rate limit does not
 * help, because one request is enough.
 *
 * Each shape below once did exactly that, or cost something close. The sizes test the
 * complexity class rather than the machine: at these lengths the old code took seconds and
 * the work now takes a millisecond or two, so a budget of 400 ms sits far from both however
 * fast or loaded the machine running it is. Several shapes are longer than MAX_LABEL_CHARS,
 * which the route would refuse, so that a return to quadratic time cannot hide on a fast
 * machine.
 */
const BUDGET_MS = 400;

const records: IngredientRecord[] = Array.from({ length: 2_000 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  inciName: `Ingredient ${i}`,
  aliases: [],
  regulatoryStatus: 'none',
  sourceCitation: 'synthetic',
  riskTags: [],
}));
const index = buildIngredientIndex(records);

/** What POST /analyze does with a label, minus the HTTP. */
function readLabel(label: string): number {
  const names = parseIngredientList(label);
  // The route refuses an empty list and one over its ceiling before it analyses anything.
  if (names.length === 0 || names.length > 400) return names.length;
  return analyseNames(names, index, [], { skinType: null, suggestUnmatched: true }).unrecognised
    .length;
}

// Three times the route's ceiling, so a return to quadratic time costs seconds and cannot hide.
const LONG = MAX_LABEL_CHARS * 3;

const SHAPES: [name: string, make: () => string][] = [
  // Cubic in the original: 2,500 spaces cost about four seconds and 4,000 cost seventeen.
  // Longer runs would hang the runner on a regression instead of failing the test.
  ['a run of spaces', () => `a${' '.repeat(2_500)}b`],
  ['a run of dots', () => `a${'.'.repeat(LONG - 2)}b`],
  ['a run of digits', () => `a${'1'.repeat(LONG - 1)}`],
  ['open brackets', () => '('.repeat(LONG)],
  ['repeated open brackets after a word', () => 'x ('.repeat(LONG / 3)],
  // Quadratic in the may-contain pattern, which is unchanged and mild. Kept short so it
  // measures the class without being the shape that flakes on a loaded machine.
  ['an unclosed may-contain marker, repeated', () => '[+/-'.repeat(MAX_LABEL_CHARS / 8)],
  [
    'a long run of short slash-separated parts',
    () =>
      Array.from(
        { length: Math.floor(LONG / 7) },
        (_, i) => `ab${String(i).padStart(4, '0')}`,
      ).join('/'),
  ],
  ['one very long name', () => 'a'.repeat(LONG)],
  [
    'the most names the route accepts',
    () => Array.from({ length: 400 }, (_, i) => `Ingredient ${i} x`.padEnd(49, 'q')).join(', '),
  ],
];

describe('reading a label of any shape', () => {
  it.each(SHAPES)('stays fast on %s', (_name, make) => {
    const label = make();
    const started = performance.now();
    readLabel(label);
    expect(performance.now() - started).toBeLessThan(BUDGET_MS);
  });
});

// The regexes the linear trimmers replaced. They are correct and slow, which makes them the
// right oracle: the trimmers must agree with them on everything short enough to run them.
const SLOW_TRAILING_NOISE = /[*\u2020\u2021.\s]+$/;
const SLOW_TRAILING_PERCENT = /\s*\(?\s*\d+(?:[.,]\d+)?\s*%\s*\)?$/;

describe('the linear trimmers agree with the regexes they replaced', () => {
  const ALPHABET = ['a', '1', '2', '.', ',', '%', ' ', '(', ')', '\t', '*', '\u00a0'];

  function disagreements(strings: Iterable<string>): string[] {
    const found: string[] = [];
    for (const text of strings) {
      if (
        trimTrailingNoise(text) !== text.replace(SLOW_TRAILING_NOISE, '') ||
        stripTrailingPercent(text) !== text.replace(SLOW_TRAILING_PERCENT, '')
      ) {
        found.push(JSON.stringify(text));
      }
    }
    return found;
  }

  function* every(maxLength: number, prefix = ''): Generator<string> {
    yield prefix;
    if (prefix.length === maxLength) return;
    for (const symbol of ALPHABET) yield* every(maxLength, prefix + symbol);
  }

  it('on every string of up to four symbols', () => {
    expect(disagreements(every(4))).toEqual([]);
  });

  it('on sixty thousand random strings of up to fourteen symbols', () => {
    let state = 20_261_012; // fixed, so a failure reproduces
    const random = () => (state = (state * 1_664_525 + 1_013_904_223) >>> 0) / 2 ** 32;
    const strings = Array.from({ length: 60_000 }, () => {
      let text = '';
      for (let n = Math.floor(random() * 15); n > 0; n--) {
        text += ALPHABET[Math.floor(random() * ALPHABET.length)]!;
      }
      return text;
    });
    expect(disagreements(strings)).toEqual([]);
  });
});
