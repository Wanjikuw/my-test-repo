import { describe, it, expect } from 'vitest';
import { boundedEditDistance, distanceBudget, suggestFor } from './fuzzy';

describe('boundedEditDistance', () => {
  it('is zero for identical strings', () => {
    expect(boundedEditDistance('linalool', 'linalool', 2)).toBe(0);
  });

  it('counts a substitution, an insertion and a deletion', () => {
    expect(boundedEditDistance('linalool', 'linalooj', 2)).toBe(1);
    expect(boundedEditDistance('limonene', 'limonenes', 2)).toBe(1);
    expect(boundedEditDistance('limonene', 'limonne', 2)).toBe(1);
  });

  it('abandons early rather than computing a distance it will not use', () => {
    expect(boundedEditDistance('aqua', 'sodium lauryl sulfate', 2)).toBeGreaterThan(2);
  });

  it('handles an empty side', () => {
    expect(boundedEditDistance('', 'ab', 2)).toBe(2);
    expect(boundedEditDistance('ab', '', 2)).toBe(2);
    expect(boundedEditDistance('abc', '', 2)).toBe(3);
  });

  // The band and the shared buffers are the two places this can go quietly wrong, so it
  // is checked against the textbook full-matrix algorithm on a few thousand random pairs.
  it('agrees with the full-matrix distance wherever it is within the limit', () => {
    const reference = (a: string, b: string): number => {
      const d = Array.from({ length: a.length + 1 }, (_, i) =>
        Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
      );
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          d[i]![j] = Math.min(
            d[i - 1]![j]! + 1,
            d[i]![j - 1]! + 1,
            d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
          );
        }
      }
      return d[a.length]![b.length]!;
    };

    // Park–Miller: small enough to stay exact in a double, so every run sees the same pairs.
    let seed = 42;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const word = () =>
      Array.from({ length: Math.floor(random() * 12) }, () => 'abc'[Math.floor(random() * 3)]).join(
        '',
      );

    for (let n = 0; n < 3000; n++) {
      const a = word();
      const b = word();
      const limit = n % 4;
      expect(boundedEditDistance(a, b, limit)).toBe(Math.min(reference(a, b), limit + 1));
    }
  });
});

describe('distanceBudget', () => {
  // At two edits `Urea` reaches `Borax`, which is a different substance entirely.
  it('allows no edits for a short name', () => {
    expect(distanceBudget('urea')).toBe(0);
    expect(distanceBudget('talc')).toBe(0);
  });

  it('scales the allowance with length', () => {
    expect(distanceBudget('linalool')).toBe(1);
    expect(distanceBudget('sodium lauryl sulfate')).toBe(2);
  });
});

describe('suggestFor', () => {
  const candidates = [
    ['linalool', 'Linalool'],
    ['limonene', 'Limonene'],
    ['sodium lauryl sulfate', 'Sodium Lauryl Sulfate'],
  ] as const;

  it('recovers a plausible OCR slip', () => {
    const found = suggestFor('limonen', candidates);
    expect(found[0]?.candidate).toBe('Limonene');
  });

  it('offers nothing for a name too short to guess safely', () => {
    expect(suggestFor('urea', candidates)).toEqual([]);
  });

  it('offers nothing when the text is nowhere near anything known', () => {
    expect(suggestFor('squalane', candidates)).toEqual([]);
  });

  it('never suggests an exact match, which would have been matched already', () => {
    expect(suggestFor('linalool', candidates)).toEqual([]);
  });

  it('returns nearest first', () => {
    const found = suggestFor('linaloox', candidates);
    expect(found[0]).toEqual({ candidate: 'Linalool', distance: 1 });
  });

  it('offers an ingredient once, at the distance of its nearest key', () => {
    const keyed = [
      ['sodium lauryl sulfates', 'Sodium Lauryl Sulfate'],
      ['sodium lauryl sulfate', 'Sodium Lauryl Sulfate'],
    ] as const;
    expect(suggestFor('sodium lauryl sulfat', keyed)).toEqual([
      { candidate: 'Sodium Lauryl Sulfate', distance: 1 },
    ]);
  });
});
