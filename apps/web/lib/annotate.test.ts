import type { AnalyzeResponse, MatchedIngredient } from '@allergy-checker/shared';
import { describe, expect, it } from 'vitest';
import { annotate, placementOf } from './annotate';

function matched(inciName: string, position: number, over: Partial<MatchedIngredient> = {}) {
  return {
    ingredientId: `id-${inciName}`,
    inciName,
    riskCategories: [],
    regulatoryStatus: 'none',
    skinTypeConflicts: [],
    sourceCitation: `citation for ${inciName}`,
    userDeclaredAllergyMatch: false,
    matchedFrom: inciName,
    strategy: 'exact',
    position,
    ...over,
  } satisfies MatchedIngredient;
}

function response(over: Partial<AnalyzeResponse>): AnalyzeResponse {
  return {
    tier: 'Safe',
    explanations: [],
    profile: { skinType: null, sunExposure: null, unresolvedAllergies: [] },
    matched: [],
    unmatched: [],
    coverage: { identified: 0, total: 0, ratio: 1 },
    corpus: { ingredientCount: 1, loadedAt: '2026-09-26T09:00:00.000Z' },
    ...over,
  };
}

describe('placementOf', () => {
  it('splits a label into thirds', () => {
    expect(placementOf(0, 9)).toBe('early');
    expect(placementOf(4, 9)).toBe('middle');
    expect(placementOf(8, 9)).toBe('late');
  });

  it('says nothing for a short label or an impossible position', () => {
    expect(placementOf(0, 5)).toBeNull();
    expect(placementOf(9, 9)).toBeNull();
    expect(placementOf(-1, 9)).toBeNull();
  });
});

describe('annotate placement', () => {
  const risky = { riskCategories: ['fragrance_allergen'] } as const;
  const label = (flag: number) =>
    response({
      matched: Array.from({ length: 8 }, (_, i) =>
        matched(`Name${i}`, i, i === flag ? { riskCategories: [...risky.riskCategories] } : {}),
      ),
    });

  it('places an ingredient that has something on record', () => {
    expect(annotate(label(0))[0]?.placement).toBe('early');
    expect(annotate(label(7))[7]?.placement).toBe('late');
  });

  it('leaves benign ingredients without a hint, and never changes the annotation', () => {
    const names = annotate(label(7));
    expect(names[0]?.placement).toBeNull();
    expect(names[7]?.annotation).toBe('noted');
  });

  it('gives an unread name no placement', () => {
    const names = annotate(
      response({
        matched: Array.from({ length: 7 }, (_, i) => matched(`Name${i}`, i)),
        unmatched: [{ rawText: 'Xyzzyne', position: 7, suggestions: [] }],
      }),
    );
    expect(names[7]?.placement).toBeNull();
  });
});

describe('annotate', () => {
  it('rebuilds the label in printed order from the two lists', () => {
    const names = annotate(
      response({
        matched: [matched('Aqua', 0), matched('Coconut Oil', 2)],
        unmatched: [
          { rawText: 'Oil', position: 1, suggestions: [] },
          { rawText: 'Xyzzyne', position: 3, suggestions: [] },
        ],
      }),
    );
    expect(names.map((n) => n.printed)).toEqual(['Aqua', 'Oil', 'Coconut Oil', 'Xyzzyne']);
  });

  it('puts the match ahead of an unreadable part printed in the same entry', () => {
    const names = annotate(
      response({
        matched: [
          matched('Aqua', 0, { matchedFrom: 'Aqua/Water/Eau', strategy: 'alternate-name' }),
        ],
        unmatched: [{ rawText: 'Eau', position: 0, suggestions: [] }],
      }),
    );
    expect(names.map((n) => [n.printed, n.annotation])).toEqual([
      ['Aqua/Water/Eau', 'clean'],
      ['Eau', 'unread'],
    ]);
  });

  it('tells flagged from on record from clean by what fired, not by the tags alone', () => {
    const names = annotate(
      response({
        explanations: [{ ingredientName: 'Limonene', message: 'on your declared list' }],
        matched: [
          matched('Limonene', 0, { riskCategories: ['fragrance_allergen'] }),
          matched('Linalool', 1, { riskCategories: ['fragrance_allergen'] }),
          matched('Glycerin', 2),
        ],
      }),
    );
    expect(names.map((n) => n.annotation)).toEqual(['flagged', 'noted', 'clean']);
  });

  it('does not present a change of case as a resolution', () => {
    const [name] = annotate(
      response({ matched: [matched('GLYCERIN', 0, { matchedFrom: 'Glycerin' })] }),
    );
    expect(name?.resolved).toBeNull();
  });
});
