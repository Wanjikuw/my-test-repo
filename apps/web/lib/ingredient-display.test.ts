import type { IngredientSummary } from '@allergy-checker/shared';
import { describe, expect, it } from 'vitest';
import { matchedAlias, onRecordLine } from './ingredient-display';

function summary(overrides: Partial<IngredientSummary> = {}): IngredientSummary {
  return {
    id: 'a3f1c2d4-0000-4000-8000-000000000000',
    inciName: 'AQUA',
    aliases: [],
    regulatoryStatus: 'none',
    riskCategories: [],
    ...overrides,
  };
}

describe('onRecordLine', () => {
  it('says nothing is on record rather than implying safety', () => {
    expect(onRecordLine(summary())).toBe('No risk on record');
  });

  it('names the regulatory status', () => {
    expect(onRecordLine(summary({ regulatoryStatus: 'prohibited' }))).toBe(
      'Prohibited in cosmetics',
    );
  });

  it('lists the status ahead of the risk tags', () => {
    const item = summary({
      regulatoryStatus: 'restricted',
      riskCategories: ['fragrance_allergen', 'common_irritant'],
    });
    expect(onRecordLine(item)).toBe(
      'Restricted use · Declarable fragrance allergen · Documented irritant',
    );
  });

  it('omits the status when there is none, without leaving a stray separator', () => {
    const item = summary({ riskCategories: ['comedogenic'] });
    expect(onRecordLine(item)).toBe('Comedogenic');
  });
});

describe('matchedAlias', () => {
  it('stays quiet when the INCI name itself contains the query', () => {
    expect(matchedAlias(summary({ aliases: ['water'] }), 'aqu')).toBeNull();
  });

  it('explains a hit that only the alias accounts for', () => {
    // The headline case: the Glossary lists `water` as an INN name for AQUA.
    expect(matchedAlias(summary({ aliases: ['water', 'eau'] }), 'water')).toBe('water');
  });

  it('is case-insensitive on both sides', () => {
    expect(matchedAlias(summary({ aliases: ['Water'] }), 'WAT')).toBe('Water');
  });

  it('returns null when nothing accounts for the query', () => {
    expect(matchedAlias(summary({ aliases: ['water'] }), 'parfum')).toBeNull();
  });

  it('returns null for an empty query', () => {
    expect(matchedAlias(summary({ aliases: ['water'] }), '   ')).toBeNull();
  });
});
