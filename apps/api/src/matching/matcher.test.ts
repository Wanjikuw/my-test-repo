import { describe, it, expect } from 'vitest';
import { score } from '@allergy-checker/shared';
import {
  analyseNames,
  buildIngredientIndex,
  lookup,
  matchLabel,
  matchNames,
  type IngredientRecord,
  type SensitivityRule,
} from './matcher';

const ingredient = (over: Partial<IngredientRecord> & { id: string; inciName: string }) =>
  ({
    aliases: [],
    regulatoryStatus: 'none',
    sourceCitation: 'identity source',
    riskTags: [],
    ...over,
  }) as IngredientRecord;

const LINALOOL = ingredient({
  id: 'lin',
  inciName: 'Linalool',
  regulatoryStatus: 'restricted',
  sourceCitation: 'Annex III entry 88',
  riskTags: [{ riskCategory: 'fragrance_allergen', sourceCitation: 'Annex III entry 88' }],
});

const JOJOBA = ingredient({
  id: 'joj',
  inciName: 'Simmondsia Chinensis Seed Oil',
  aliases: ['Jojoba Oil'],
});

const SLS = ingredient({
  id: 'sls',
  inciName: 'Sodium Lauryl Sulfate',
  aliases: ['SLS'],
  riskTags: [{ riskCategory: 'common_irritant', sourceCitation: 'PMID 42343576' }],
});

const LILIAL = ingredient({
  id: 'lil',
  inciName: '2-(4-tert-butylbenzyl) propionaldehyde',
  aliases: ['Butylphenyl Methylpropional', 'Lilial'],
  regulatoryStatus: 'prohibited',
  sourceCitation: 'Annex II entry 1666',
});

const COCOA = ingredient({
  id: 'cocoa',
  inciName: 'Theobroma Cacao (Cocoa) Seed Butter',
  riskTags: [{ riskCategory: 'comedogenic', sourceCitation: 'PMID 18058303' }],
});

const SLES = ingredient({
  id: 'sles',
  inciName: 'Sodium Laureth Sulfate',
  riskTags: [{ riskCategory: 'common_irritant', sourceCitation: 'PMID 42343576' }],
});

const RULES: SensitivityRule[] = [
  {
    skinType: 'sensitive',
    riskCategory: 'fragrance_allergen',
    interactionNote: 'sensitive skin reacts more readily to fragrance allergens',
  },
  {
    skinType: 'dry',
    riskCategory: 'common_irritant',
    interactionNote: 'dry skin has a weaker barrier',
  },
];

const INDEX = buildIngredientIndex([LINALOOL, JOJOBA, SLS, LILIAL, COCOA, SLES]);

describe('buildIngredientIndex', () => {
  it('indexes aliases as well as the INCI name', () => {
    expect(lookup(INDEX, 'Jojoba Oil')?.record.id).toBe('joj');
    expect(lookup(INDEX, 'Lilial')?.record.id).toBe('lil');
  });

  it('resolves a name printed with a common-name insert', () => {
    expect(lookup(INDEX, 'Simmondsia Chinensis (Jojoba) Seed Oil')?.record.id).toBe('joj');
  });

  it('resolves a chemical name Annex II prints differently from the label', () => {
    expect(lookup(INDEX, 'Butylphenyl Methylpropional')?.record.id).toBe('lil');
  });

  it('does not let a later row steal a name an earlier row already claimed', () => {
    const dup = buildIngredientIndex([
      ingredient({ id: 'first', inciName: 'Shared Name' }),
      ingredient({ id: 'second', inciName: 'Shared Name' }),
    ]);
    expect(lookup(dup, 'Shared Name')?.record.id).toBe('first');
  });

  it('returns undefined rather than guessing at an unknown name', () => {
    expect(lookup(INDEX, 'Hydroxypinacolone Retinoate')).toBeUndefined();
  });
});

describe('matchNames', () => {
  it('separates matched from unmatched', () => {
    const result = matchNames(['Linalool', 'Squalane'], INDEX, RULES, { skinType: null });
    expect(result.matches.map((m) => m.inciName)).toEqual(['Linalool']);
    expect(result.unmatched.map((u) => u.rawText)).toEqual(['Squalane']);
  });

  it('attaches skin-type conflicts only for the declared skin type', () => {
    const sensitive = matchNames(['Linalool'], INDEX, RULES, { skinType: 'sensitive' });
    expect(sensitive.matches[0]?.skinTypeConflicts).toHaveLength(1);

    const oily = matchNames(['Linalool'], INDEX, RULES, { skinType: 'oily' });
    expect(oily.matches[0]?.skinTypeConflicts).toEqual([]);
  });

  it('flags a user-declared allergy through an alias', () => {
    const result = matchNames(['Sodium Lauryl Sulfate'], INDEX, RULES, {
      skinType: null,
      declaredAllergies: ['sls'],
    });
    expect(result.matches[0]?.userDeclaredAllergyMatch).toBe(true);
  });

  // A label repeating a name must not produce the same explanation twice.
  it('collapses a repeated ingredient to one match', () => {
    const result = matchNames(['Linalool', 'linalool', 'LINALOOL'], INDEX, RULES, {
      skinType: null,
    });
    expect(result.matches).toHaveLength(1);
  });

  it('collapses a repeated unrecognised name too', () => {
    const result = matchNames(['Squalane', 'squalane'], INDEX, RULES, { skinType: null });
    expect(result.unmatched).toHaveLength(1);
  });

  it('carries every risk tag citation through, losing no evidence', () => {
    const multi = buildIngredientIndex([
      ingredient({
        id: 'm',
        inciName: 'Multi',
        riskTags: [
          { riskCategory: 'comedogenic', sourceCitation: 'PMID 1' },
          { riskCategory: 'common_irritant', sourceCitation: 'PMID 2' },
        ],
      }),
    ]);
    const result = matchNames(['Multi'], multi, RULES, { skinType: null });
    expect(result.matches[0]?.sourceCitation).toContain('PMID 1');
    expect(result.matches[0]?.sourceCitation).toContain('PMID 2');
  });

  it('falls back to the identity citation when an ingredient carries no risk tag', () => {
    const result = matchNames(['Jojoba Oil'], INDEX, RULES, { skinType: null });
    expect(result.matches[0]?.sourceCitation).toBe('identity source');
  });
});

describe('matchLabel end to end', () => {
  it('parses, matches and scores a printed label', () => {
    const label = 'Aqua, Simmondsia Chinensis (Jojoba) Seed Oil, Linalool, 1,2-Hexanediol';
    const result = matchLabel(label, INDEX, RULES, { skinType: 'sensitive' });

    expect(result.matches.map((m) => m.inciName)).toEqual([
      'Simmondsia Chinensis Seed Oil',
      'Linalool',
    ]);
    // The digit-guarded split is what keeps this one name rather than two fragments.
    expect(result.unmatched.map((u) => u.rawText)).toEqual(['Aqua', '1,2-Hexanediol']);

    const scored = score(result);
    expect(scored.tier).toBe('Avoid'); // rule 3: sensitive skin + regulation-backed tag
    expect(scored.explanations.length).toBeGreaterThan(0);
  });

  it('sends a prohibited ingredient to Avoid regardless of skin type', () => {
    const result = matchLabel('Aqua, Lilial', INDEX, RULES, { skinType: 'normal' });
    expect(score(result).tier).toBe('Avoid');
  });

  it('reports UnverifiedCaution when nothing on the label is recognised', () => {
    const result = matchLabel('Squalane, Dimethyl Isosorbide', INDEX, RULES, {
      skinType: 'normal',
    });
    expect(result.matches).toEqual([]);
    expect(score(result).tier).toBe('UnverifiedCaution');
  });
});

describe('match provenance', () => {
  it('records an exact resolution as exact', () => {
    const analysis = analyseNames(['Linalool'], INDEX, RULES, { skinType: null });
    expect(analysis.provenance[0]?.strategy).toBe('exact');
  });

  it('records a common-name-insert resolution as loose', () => {
    const analysis = analyseNames(['Simmondsia Chinensis (Jojoba) Seed Oil'], INDEX, RULES, {
      skinType: null,
    });
    expect(analysis.provenance[0]?.strategy).toBe('loose');
    expect(analysis.provenance[0]?.inciName).toBe('Simmondsia Chinensis Seed Oil');
  });

  it('keeps the raw text alongside the name it resolved to', () => {
    const analysis = analyseNames(['Lilial'], INDEX, RULES, { skinType: null });
    expect(analysis.provenance[0]?.rawText).toBe('Lilial');
    expect(analysis.provenance[0]?.inciName).toBe('2-(4-tert-butylbenzyl) propionaldehyde');
  });

  it('does not let a weaker key shadow another ingredient exact name', () => {
    const index = buildIngredientIndex([
      ingredient({ id: 'weak', inciName: 'Something (Water) Extract' }),
      ingredient({ id: 'strong', inciName: 'Water Extract' }),
    ]);
    expect(lookup(index, 'Water Extract')?.record.id).toBe('strong');
  });
});

describe('British spelling on a label', () => {
  it('resolves Sulphate to the Sulfate the dataset holds', () => {
    const analysis = analyseNames(['Sodium Laureth Sulphate'], INDEX, RULES, { skinType: null });
    expect(analysis.result.matches[0]?.inciName).toBe('Sodium Laureth Sulfate');
    expect(analysis.provenance[0]?.strategy).toBe('exact');
  });
});

describe('common name printed alone', () => {
  it('resolves Cocoa Seed Butter to the binomial in the dataset', () => {
    const analysis = analyseNames(['Cocoa Seed Butter'], INDEX, RULES, { skinType: null });
    expect(analysis.result.matches[0]?.inciName).toBe('Theobroma Cacao (Cocoa) Seed Butter');
    expect(analysis.provenance[0]?.strategy).toBe('common-name');
  });
});

describe('fuzzy suggestions', () => {
  it('are withheld unless the caller asks for them', () => {
    const analysis = analyseNames(['Linalol'], INDEX, RULES, { skinType: null });
    expect(analysis.suggestions).toEqual([]);
  });

  it('recover a likely OCR slip', () => {
    const analysis = analyseNames(['Linalol'], INDEX, RULES, {
      skinType: null,
      suggestUnmatched: true,
    });
    expect(analysis.suggestions[0]?.candidate).toBe('Linalool');
  });

  // The safety property the whole design turns on.
  it('never enter the result the scoring engine sees', () => {
    const analysis = analyseNames(['Linalol'], INDEX, RULES, {
      skinType: 'sensitive',
      suggestUnmatched: true,
    });
    expect(analysis.suggestions.length).toBeGreaterThan(0);
    expect(analysis.result.matches).toEqual([]);
    expect(analysis.result.unmatched.map((u) => u.rawText)).toEqual(['Linalol']);
    expect(score(analysis.result).tier).toBe('UnverifiedCaution');
  });
});
