import type { AnalyzeResponse, MatchedIngredient } from '@allergy-checker/shared';
import { describe, expect, it } from 'vitest';
import { annotate } from './annotate';

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
