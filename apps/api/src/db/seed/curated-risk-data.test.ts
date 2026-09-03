import { describe, it, expect } from 'vitest';
import {
  substitutedFragranceAllergens,
  addedFragranceAllergens,
  preExistingFragranceAllergens,
  curatedFragranceAllergens,
  curatedPreservativeSensitizers,
  repealedAnnexEntries,
  deletedFragranceAllergenEntries,
} from './curated-risk-data';

/**
 * Guards the hand-transcribed Annex III dataset against the failure modes that would be
 * invisible at runtime: a duplicated substance, a mistyped entry number, a revived
 * repealed entry, or a risk tag with no citation.
 */
describe('curated Annex III fragrance allergen dataset', () => {
  it('matches the entry counts stated in Regulation (EU) 2023/1545', () => {
    expect(substitutedFragranceAllergens).toHaveLength(17);
    expect(addedFragranceAllergens).toHaveLength(45);
    expect(preExistingFragranceAllergens).toHaveLength(19);
    expect(curatedFragranceAllergens).toHaveLength(81);
  });

  it('covers entries 67-92 except the three the consolidated text struck out', () => {
    const inRange = curatedFragranceAllergens
      .map((e) => e.annexEntry)
      .filter((n) => n >= 67 && n <= 92)
      .sort((a, b) => a - b);
    const expected = Array.from({ length: 26 }, (_, i) => 67 + i).filter(
      (n) => ![68, 79, 83].includes(n),
    );
    expect(inRange).toEqual(expected);
  });

  it('never seeds an entry the consolidated text deleted', () => {
    const deleted = deletedFragranceAllergenEntries.map((d) => d.annexEntry);
    const seeded = curatedFragranceAllergens.map((e) => e.annexEntry);
    expect(seeded.filter((n) => deleted.includes(n))).toEqual([]);
  });

  it('explains why each deleted entry is absent', () => {
    for (const d of deletedFragranceAllergenEntries) {
      expect(d.reason.trim().length).toBeGreaterThan(20);
    }
  });

  it('substitutes exactly the entries the regulation lists', () => {
    const expected = [
      45, 46, 70, 73, 86, 88, 109, 114, 122, 124, 131, 133, 154, 157, 175, 196, 324,
    ];
    expect(substitutedFragranceAllergens.map((e) => e.annexEntry)).toEqual(expected);
  });

  it('adds a contiguous block of entries 327-371', () => {
    const expected = Array.from({ length: 45 }, (_, i) => 327 + i);
    expect(addedFragranceAllergens.map((e) => e.annexEntry)).toEqual(expected);
  });

  it('never seeds an entry the regulation repealed', () => {
    const seeded = curatedFragranceAllergens.map((e) => e.annexEntry);
    const revived = seeded.filter((n) => repealedAnnexEntries.includes(n));
    expect(revived).toEqual([]);
  });

  it('has no duplicate INCI names across the whole curated set', () => {
    const names = [...curatedFragranceAllergens, ...curatedPreservativeSensitizers].map((e) =>
      e.inciName.toLowerCase(),
    );
    const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
    expect(duplicates).toEqual([]);
  });

  it('never lets an alias collide with a different entry primary name', () => {
    const primary = new Set(curatedFragranceAllergens.map((e) => e.inciName.toLowerCase()));
    const collisions = curatedFragranceAllergens.flatMap((e) =>
      e.aliases.filter((a) => primary.has(a.toLowerCase())).map((a) => `${e.inciName} -> ${a}`),
    );
    expect(collisions).toEqual([]);
  });

  it('gives every entry a non-empty source citation', () => {
    const uncited = [...curatedFragranceAllergens, ...curatedPreservativeSensitizers].filter(
      (e) => e.sourceCitation.trim().length === 0,
    );
    expect(uncited).toEqual([]);
  });

  it('cites a specific Annex III entry number for every fragrance allergen', () => {
    const vague = curatedFragranceAllergens.filter(
      (e) => !new RegExp(`entry ${e.annexEntry}\\b`).test(e.sourceCitation),
    );
    expect(vague).toEqual([]);
  });
});
