import { describe, it, expect } from 'vitest';
import { REGULATION_BACKED_CATEGORIES } from '@allergy-checker/shared';
import {
  substitutedFragranceAllergens,
  addedFragranceAllergens,
  preExistingFragranceAllergens,
  curatedFragranceAllergens,
  curatedPreservativeSensitizers,
  curatedComedogenicIngredients,
  curatedCommonIrritants,
  curatedPhotosensitizers,
  nonComedogenicControls,
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

describe('curated comedogenic dataset', () => {
  it('cites a named study with a PMID for every entry', () => {
    for (const entry of curatedComedogenicIngredients) {
      expect(entry.sourceCitation).toMatch(/PMID \d+/);
      expect(entry.riskCategory).toBe('comedogenic');
    }
  });

  it('claims no CAS identity, because neither source paper gives one', () => {
    for (const entry of curatedComedogenicIngredients) {
      expect(entry.casNumbers).toEqual([]);
      expect(entry.ecNumbers).toEqual([]);
    }
  });

  it('claims no regulatory provision, because no Annex covers comedogenicity', () => {
    for (const entry of curatedComedogenicIngredients) {
      expect(entry.annexEntry).toBe(0);
    }
  });

  // Draelos & DiNardo (PMID 16488305) found comedogenic raw materials do not reliably make
  // finished products comedogenic, so this evidence must never drive an Avoid.
  it('stays out of the regulation-backed set that rule 3 escalates on', () => {
    expect(REGULATION_BACKED_CATEGORIES).not.toContain('comedogenic');
  });

  it('never tags a material the same studies reported as negative', () => {
    const tagged = new Set(
      curatedComedogenicIngredients.flatMap((e) => [e.inciName, ...e.aliases]),
    );
    expect(nonComedogenicControls.filter((c) => tagged.has(c))).toEqual([]);
  });

  it('lists each ingredient once', () => {
    const names = curatedComedogenicIngredients.map((e) => e.inciName);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('curated photosensitizing dataset', () => {
  it('covers exactly the three Annex III entries that restrict UV exposure', () => {
    expect(curatedPhotosensitizers.map((e) => e.annexEntry)).toEqual([308, 309, 323]);
  });

  it('quotes the UV restriction as its evidence rather than inferring the hazard', () => {
    for (const entry of curatedPhotosensitizers) {
      expect(entry.sourceCitation).toContain('Annex III entry');
      expect(entry.sourceCitation).toContain('UV light');
      expect(entry.riskCategory).toBe('photosensitizing');
    }
  });

  // The citrus oils carry only a labelling threshold, so they are fragrance allergens here.
  it('does not claim the Annex III citrus oils are photosensitizers', () => {
    const names = curatedPhotosensitizers.map((e) => e.inciName.toLowerCase());
    expect(names.some((n) => n.includes('citrus'))).toBe(false);
  });
});

describe('curated common irritant dataset', () => {
  it('cites a named study with a PMID for every entry', () => {
    for (const entry of curatedCommonIrritants) {
      expect(entry.sourceCitation).toMatch(/PMID \d+/);
      expect(entry.riskCategory).toBe('common_irritant');
    }
  });

  it('claims no regulatory provision, because Annex III never mentions irritation', () => {
    for (const entry of curatedCommonIrritants) {
      expect(entry.annexEntry).toBe(0);
      expect(entry.casNumbers).toEqual([]);
    }
  });

  it('keeps irritants out of the allergen categories', () => {
    const allergenNames = new Set(
      [...curatedFragranceAllergens, ...curatedPreservativeSensitizers].map((e) => e.inciName),
    );
    expect(curatedCommonIrritants.filter((e) => allergenNames.has(e.inciName))).toEqual([]);
  });

  it('lists each ingredient once', () => {
    const names = curatedCommonIrritants.map((e) => e.inciName);
    expect(new Set(names).size).toBe(names.length);
  });
});
