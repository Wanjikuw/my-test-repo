import { describe, it, expect } from 'vitest';
import { collateRecords, type JoinedRow } from './context';

const ing = (id: string, inciName: string) => ({
  id,
  inciName,
  aliases: [],
  regulatoryStatus: 'none' as const,
  sourceCitation: 'identity',
});

describe('collateRecords', () => {
  it('collapses repeated join rows into one record per ingredient', () => {
    const rows: JoinedRow[] = [
      {
        ingredients: ing('a', 'Cocoa Butter'),
        ingredient_risk_tags: { riskCategory: 'comedogenic', sourceCitation: 'PMID 1' },
      },
      {
        ingredients: ing('a', 'Cocoa Butter'),
        ingredient_risk_tags: { riskCategory: 'common_irritant', sourceCitation: 'PMID 2' },
      },
    ];

    const records = collateRecords(rows);
    expect(records).toHaveLength(1);
    expect(records[0]?.riskTags.map((t) => t.riskCategory)).toEqual([
      'comedogenic',
      'common_irritant',
    ]);
  });

  // A left join produces a null tag for untagged ingredients. Dropping those would make
  // a known-but-unremarkable ingredient look identical to one we have never heard of.
  it('keeps an ingredient that carries no risk tag', () => {
    const rows: JoinedRow[] = [{ ingredients: ing('b', 'Squalane'), ingredient_risk_tags: null }];

    const records = collateRecords(rows);
    expect(records).toHaveLength(1);
    expect(records[0]?.riskTags).toEqual([]);
  });

  it('preserves each ingredient separately', () => {
    const rows: JoinedRow[] = [
      { ingredients: ing('a', 'One'), ingredient_risk_tags: null },
      { ingredients: ing('b', 'Two'), ingredient_risk_tags: null },
    ];
    expect(collateRecords(rows).map((r) => r.inciName)).toEqual(['One', 'Two']);
  });

  it('returns nothing for no rows', () => {
    expect(collateRecords([])).toEqual([]);
  });
});
