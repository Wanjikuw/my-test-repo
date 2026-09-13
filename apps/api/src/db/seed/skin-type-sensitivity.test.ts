import { describe, expect, it } from 'vitest';
import { SkinType, RiskCategory } from '@allergy-checker/shared';
import { skinTypeSensitivities } from './skin-type-sensitivity';

describe('skin type sensitivity map', () => {
  it('has no duplicate (skin type, risk category) pairs', () => {
    const keys = skinTypeSensitivities.map((e) => `${e.skinType}:${e.riskCategory}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('uses only skin types and categories the shared contract accepts', () => {
    for (const e of skinTypeSensitivities) {
      expect(SkinType.parse(e.skinType)).toBe(e.skinType);
      expect(RiskCategory.parse(e.riskCategory)).toBe(e.riskCategory);
    }
  });

  it('never assigns a sensitivity to normal skin', () => {
    expect(skinTypeSensitivities.filter((e) => e.skinType === 'normal')).toEqual([]);
  });

  it('explains a mechanism rather than restating the tag', () => {
    for (const e of skinTypeSensitivities) {
      expect(e.interactionNote.length).toBeGreaterThan(60);
      expect(e.interactionNote.trim()).toMatch(/\.$/);
      expect(e.interactionNote.toLowerCase()).not.toBe(e.riskCategory.replace(/_/g, ' '));
    }
  });

  it('keeps at least one row that can fire against the data seeded today', () => {
    // Only fragrance_allergen and preservative_sensitizer have tagged ingredients, and
    // sensitive skin is shadowed by rule 3, so a non-sensitive row is what proves rule 5.
    const firesToday = skinTypeSensitivities.filter(
      (e) =>
        e.skinType !== 'sensitive' &&
        ['fragrance_allergen', 'preservative_sensitizer'].includes(e.riskCategory),
    );
    expect(firesToday.length).toBeGreaterThan(0);
  });
});
