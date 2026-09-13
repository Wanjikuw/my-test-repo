import { describe, expect, it } from 'vitest';
import {
  score,
  TIER_SEVERITY,
  type IngredientMatch,
  type MatchResult,
  type RiskCategory,
  type RegulatoryStatus,
  type SkinType,
  type SkinTypeConflict,
} from './scoring';

function match(inciName: string, over: Partial<IngredientMatch> = {}): IngredientMatch {
  return {
    ingredientId: `id-${inciName}`,
    inciName,
    riskCategories: [],
    regulatoryStatus: 'none' as RegulatoryStatus,
    skinTypeConflicts: [],
    sourceCitation: `citation for ${inciName}`,
    userDeclaredAllergyMatch: false,
    ...over,
  };
}

function result(over: Partial<MatchResult> = {}): MatchResult {
  return { skinType: null, matches: [], unmatched: [], ...over };
}

const conflict = (riskCategory: RiskCategory, note = 'Note.'): SkinTypeConflict => ({
  riskCategory,
  interactionNote: note,
});

describe('tier severity', () => {
  it('orders Avoid > Caution > UnverifiedCaution > Safe', () => {
    expect(TIER_SEVERITY.Avoid).toBeGreaterThan(TIER_SEVERITY.Caution);
    expect(TIER_SEVERITY.Caution).toBeGreaterThan(TIER_SEVERITY.UnverifiedCaution);
    expect(TIER_SEVERITY.UnverifiedCaution).toBeGreaterThan(TIER_SEVERITY.Safe);
  });
});

describe('score — precedence rules', () => {
  it('rule 1: a prohibited ingredient is Avoid with no profile at all', () => {
    const r = score(result({ matches: [match('Lyral', { regulatoryStatus: 'prohibited' })] }));
    expect(r.tier).toBe('Avoid');
    expect(r.explanations[0]?.message).toContain('prohibited in cosmetic products');
  });

  it('rule 2: a declared allergy is Avoid', () => {
    const r = score(
      result({
        matches: [match('Aqua'), match('Limonene', { userDeclaredAllergyMatch: true })],
      }),
    );
    expect(r.tier).toBe('Avoid');
    expect(r.explanations[0]?.ingredientName).toBe('Limonene');
  });

  it('rule 3: sensitive skin escalates a regulation-backed tag to Avoid', () => {
    const r = score(
      result({
        skinType: 'sensitive',
        matches: [match('Methylisothiazolinone', { riskCategories: ['preservative_sensitizer'] })],
      }),
    );
    expect(r.tier).toBe('Avoid');
  });

  it('rule 3 does not escalate a literature-curated tag', () => {
    const r = score(
      result({
        skinType: 'sensitive',
        matches: [match('Coconut Oil', { riskCategories: ['comedogenic'] })],
      }),
    );
    expect(r.tier).toBe('Safe');
  });

  it('rule 4: a fragrance-role ban is Caution, never Avoid', () => {
    const r = score(
      result({
        matches: [
          match('Ficus Carica Leaf Extract', { regulatoryStatus: 'prohibited_as_fragrance' }),
        ],
      }),
    );
    expect(r.tier).toBe('Caution');
    expect(r.explanations[0]?.message).toContain('cannot show which role');
  });

  it('rule 5: a skin-type conflict is Caution and carries the interaction note', () => {
    const r = score(
      result({
        skinType: 'dry',
        matches: [
          match('Limonene', {
            riskCategories: ['fragrance_allergen'],
            skinTypeConflicts: [conflict('fragrance_allergen', 'Dry skin has a weaker barrier.')],
          }),
        ],
      }),
    );
    expect(r.tier).toBe('Caution');
    expect(r.explanations[0]?.message).toContain('Dry skin has a weaker barrier.');
  });

  it('rule 6: an unrecognised ingredient is UnverifiedCaution, never Safe', () => {
    const r = score(result({ matches: [match('Aqua')], unmatched: [{ rawText: 'Xyzzyne' }] }));
    expect(r.tier).toBe('UnverifiedCaution');
  });

  it('rule 7: everything matched and nothing triggered is Safe, still explained', () => {
    const r = score(result({ matches: [match('Aqua'), match('Glycerin')] }));
    expect(r.tier).toBe('Safe');
    expect(r.explanations).toHaveLength(1);
    expect(r.explanations[0]?.message).toContain('2 ingredients');
  });

  it('words the Safe verdict correctly for one ingredient and for none', () => {
    expect(score(result({ matches: [match('Aqua')] })).explanations[0]?.message).toContain(
      'single ingredient',
    );
    expect(score(result()).explanations[0]?.message).toContain('No ingredients were supplied');
  });
});

describe('score — tie-breaks', () => {
  it('a declared allergy is not masked by an unknown ingredient', () => {
    const r = score(
      result({
        matches: [match('Limonene', { userDeclaredAllergyMatch: true })],
        unmatched: [{ rawText: 'Xyzzyne' }],
      }),
    );
    expect(r.tier).toBe('Avoid');
  });

  it('rule 1 outranks a rule 5 Caution but both are explained', () => {
    const r = score(
      result({
        skinType: 'dry',
        matches: [
          match('Lyral', { regulatoryStatus: 'prohibited' }),
          match('Linalool', {
            riskCategories: ['fragrance_allergen'],
            skinTypeConflicts: [conflict('fragrance_allergen')],
          }),
        ],
      }),
    );
    expect(r.tier).toBe('Avoid');
    expect(r.explanations.map((e) => e.ingredientName)).toEqual(['Lyral', 'Linalool']);
  });

  it('sensitive skin means rule 3 shadows rule 5 for the same ingredient', () => {
    const r = score(
      result({
        skinType: 'sensitive' as SkinType,
        matches: [
          match('Linalool', {
            riskCategories: ['fragrance_allergen'],
            skinTypeConflicts: [conflict('fragrance_allergen')],
          }),
        ],
      }),
    );
    expect(r.tier).toBe('Avoid');
    // One ingredient must not be explained twice with near-identical sentences.
    expect(r.explanations).toHaveLength(1);
    expect(r.explanations[0]?.message).toContain('sensitive skin');
  });

  it('still applies rule 5 to a category rule 3 did not escalate', () => {
    const r = score(
      result({
        skinType: 'sensitive' as SkinType,
        matches: [
          match('Coconut Oil', {
            riskCategories: ['comedogenic'],
            skinTypeConflicts: [conflict('comedogenic', 'Occludes follicles.')],
          }),
        ],
      }),
    );
    expect(r.tier).toBe('Caution');
    expect(r.explanations).toHaveLength(1);
  });

  it('never puts a raw enum name in user-facing text', () => {
    const r = score(
      result({
        skinType: 'dry',
        matches: [
          match('Linalool', {
            riskCategories: ['fragrance_allergen'],
            skinTypeConflicts: [conflict('fragrance_allergen', 'Strips the barrier.')],
          }),
        ],
      }),
    );
    for (const e of r.explanations) {
      expect(e.message).not.toMatch(/[a-z]+_[a-z]+/);
    }
  });

  it('never returns a tier without an explanation', () => {
    const cases: MatchResult[] = [
      result(),
      result({ matches: [match('Aqua')] }),
      result({ unmatched: [{ rawText: 'Xyzzyne' }] }),
      result({ matches: [match('Lyral', { regulatoryStatus: 'prohibited' })] }),
    ];
    for (const c of cases) {
      expect(score(c).explanations.length).toBeGreaterThan(0);
    }
  });
});
