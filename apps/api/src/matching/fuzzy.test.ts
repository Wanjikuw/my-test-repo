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
    const found = suggestFor('Limonen', 'limonen', candidates);
    expect(found[0]?.candidate).toBe('Limonene');
  });

  it('offers nothing for a name too short to guess safely', () => {
    expect(suggestFor('Urea', 'urea', candidates)).toEqual([]);
  });

  it('offers nothing when the text is nowhere near anything known', () => {
    expect(suggestFor('Squalane', 'squalane', candidates)).toEqual([]);
  });

  it('never suggests an exact match, which would have been matched already', () => {
    expect(suggestFor('Linalool', 'linalool', candidates)).toEqual([]);
  });

  it('returns nearest first', () => {
    const found = suggestFor('linalooX', 'linaloox', candidates);
    expect(found[0]?.candidate).toBe('Linalool');
    expect(found[0]?.distance).toBe(1);
  });
});
