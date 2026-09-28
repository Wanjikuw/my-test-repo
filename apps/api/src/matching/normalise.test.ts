import { describe, it, expect } from 'vitest';
import {
  normaliseInciName,
  looseInciName,
  commonNameVariant,
  parseIngredientList,
} from './normalise';

describe('parseIngredientList', () => {
  it('splits an ordinary comma-separated label', () => {
    expect(parseIngredientList('Aqua, Glycerin, Squalane')).toEqual([
      'Aqua',
      'Glycerin',
      'Squalane',
    ]);
  });

  // The failure this guards is silent: the fragments simply never match anything.
  it('does not split a chemical name on its internal comma', () => {
    expect(parseIngredientList('Aqua, 1,2-Hexanediol, Glycerin')).toEqual([
      'Aqua',
      '1,2-Hexanediol',
      'Glycerin',
    ]);
    expect(parseIngredientList('2,6-Dihydroxy-4-methyl-benzaldehyde')).toEqual([
      '2,6-Dihydroxy-4-methyl-benzaldehyde',
    ]);
  });

  // A name may legitimately end in a digit. Colour indices are printed in runs, so
  // treating a digit on one side as reason enough to keep a comma merged every shade on
  // the label into a single unmatchable name.
  it('still splits when only one side of the comma is a digit', () => {
    expect(parseIngredientList('CI 77491, CI 77492, CI 77499')).toEqual([
      'CI 77491',
      'CI 77492',
      'CI 77499',
    ]);
    expect(parseIngredientList('Aqua, 1,2-Hexanediol, CI 77891')).toEqual([
      'Aqua',
      '1,2-Hexanediol',
      'CI 77891',
    ]);
  });

  it('accepts newlines and semicolons as separators', () => {
    expect(parseIngredientList('Aqua\nGlycerin; Squalane')).toEqual([
      'Aqua',
      'Glycerin',
      'Squalane',
    ]);
  });

  it('drops empty segments and trailing punctuation', () => {
    expect(parseIngredientList('Aqua, , Glycerin.')).toEqual(['Aqua', 'Glycerin']);
  });

  it('strips organic markers printed next to a name', () => {
    expect(parseIngredientList('Aloe Barbadensis Leaf Juice*, Glycerin')).toEqual([
      'Aloe Barbadensis Leaf Juice',
      'Glycerin',
    ]);
  });

  it('handles the zero-width space a real retailer label carried', () => {
    expect(parseIngredientList('Caprylic/\u200bCapric Triglyceride')).toEqual([
      'Caprylic/Capric Triglyceride',
    ]);
  });

  it('returns nothing for an empty or whitespace-only label', () => {
    expect(parseIngredientList('')).toEqual([]);
    expect(parseIngredientList('   \n  ')).toEqual([]);
  });
});

describe('parseIngredientList — label furniture', () => {
  // Without this the first name reads `Ingredients: Aqua` and never matches.
  it('drops the heading and everything printed before it', () => {
    expect(parseIngredientList('Hydrating cream 50 ml. INGREDIENTS: Aqua, Glycerin')).toEqual([
      'Aqua',
      'Glycerin',
    ]);
  });

  it('reads a bilingual heading', () => {
    expect(parseIngredientList('Ingredients/Ingrédients: Aqua, Glycerin')).toEqual([
      'Aqua',
      'Glycerin',
    ]);
  });

  it('treats a later heading as the list repeated, not as a name', () => {
    expect(parseIngredientList('Ingredients: Aqua, Glycerin. Zutaten: Aqua')).toEqual([
      'Aqua',
      'Glycerin',
      'Aqua',
    ]);
  });

  it('drops a heading OCR printed without its colon, where it opens the text', () => {
    expect(parseIngredientList('Ingredients Aqua, Glycerin')).toEqual(['Aqua', 'Glycerin']);
  });

  it('unpacks a may-contain block into the shades it lists', () => {
    expect(parseIngredientList('Mica, Talc [+/- CI 77491, CI 77492, CI 77499]')).toEqual([
      'Mica',
      'Talc',
      'CI 77491',
      'CI 77492',
      'CI 77499',
    ]);
    expect(parseIngredientList('Talc, May contain: CI 77891, (+/-) CI 77007')).toEqual([
      'Talc',
      'CI 77891',
      'CI 77007',
    ]);
  });

  it('drops a concentration printed after a name', () => {
    expect(parseIngredientList('Niacinamide 10%, Zinc PCA (1%), Aqua')).toEqual([
      'Niacinamide',
      'Zinc PCA',
      'Aqua',
    ]);
  });

  it('splits on bullets and full-width commas as well', () => {
    expect(parseIngredientList('Aqua • Glycerin · Squalane，Tocopherol')).toEqual([
      'Aqua',
      'Glycerin',
      'Squalane',
      'Tocopherol',
    ]);
  });

  it('drops list bullets printed ahead of a name', () => {
    expect(parseIngredientList('- Aqua\n* Glycerin')).toEqual(['Aqua', 'Glycerin']);
  });

  it('keeps a chemical name whose hyphen opens a locant', () => {
    expect(parseIngredientList('Aqua, 1,2-Hexanediol')).toEqual(['Aqua', '1,2-Hexanediol']);
  });
});

describe('normaliseInciName', () => {
  it('is case- and whitespace-insensitive', () => {
    expect(normaliseInciName('  SODIUM   Lauryl Sulfate ')).toBe('sodium lauryl sulfate');
  });

  it('folds unicode dashes onto the plain hyphen INCI uses', () => {
    expect(normaliseInciName('C12\u201315 Alkyl Benzoate')).toBe('c12-15 alkyl benzoate');
  });

  it('removes invisible characters', () => {
    expect(normaliseInciName('Caprylic/\u200bCapric Triglyceride')).toBe(
      'caprylic/capric triglyceride',
    );
  });

  // Keeping parentheses is what stops two different chemicals collapsing onto one key.
  it('keeps parentheses, so it cannot merge distinct chemical names', () => {
    expect(
      normaliseInciName('3- and 4-(4-Hydroxy-4-methylpentyl) cyclohex-3-ene-1-carbaldehyde'),
    ).toContain('(4-hydroxy-4-methylpentyl)');
  });
});

describe('looseInciName', () => {
  it('removes the common-name insert from an INCI binomial', () => {
    expect(looseInciName('Simmondsia Chinensis (Jojoba) Seed Oil')).toBe(
      'simmondsia chinensis seed oil',
    );
    expect(looseInciName('Rosmarinus Officinalis (Rosemary) Leaf Extract')).toBe(
      'rosmarinus officinalis leaf extract',
    );
  });

  it('leaves a name without parentheses untouched', () => {
    expect(looseInciName('Squalane')).toBe('squalane');
  });

  it('collapses the gap the removed insert leaves behind', () => {
    expect(looseInciName('Aqua (Water)')).toBe('aqua');
  });
});

describe('spelling canonicalisation', () => {
  it('folds British spellings onto the INCI glossary forms', () => {
    expect(normaliseInciName('Sodium Laureth Sulphate')).toBe('sodium laureth sulfate');
    expect(normaliseInciName('Aluminium Starch Octenylsuccinate')).toBe(
      'aluminum starch octenylsuccinate',
    );
    expect(normaliseInciName('Glycerine')).toBe('glycerin');
  });

  it('folds the same way from either direction, so the index and query agree', () => {
    expect(normaliseInciName('Sulphate')).toBe(normaliseInciName('Sulfate'));
  });

  it('folds the sulpho- compounds too, not only sulphate', () => {
    expect(normaliseInciName('Sodium Lauryl Sulphoacetate')).toBe('sodium lauryl sulfoacetate');
  });
});

describe('commonNameVariant', () => {
  it('swaps the binomial for the bracketed common name', () => {
    expect(commonNameVariant('Theobroma Cacao (Cocoa) Seed Butter')).toBe('cocoa seed butter');
    expect(commonNameVariant('Simmondsia Chinensis (Jojoba) Seed Oil')).toBe('jojoba seed oil');
  });

  it('handles an insert with nothing after it', () => {
    expect(commonNameVariant('Aqua (Water)')).toBe('water');
  });

  it('returns null when there is no parenthetical', () => {
    expect(commonNameVariant('Squalane')).toBeNull();
  });

  // Without this guard a chemical fragment becomes a nonsense key that fuzzy search
  // could later latch onto.
  it('refuses a parenthetical that is not a plain word', () => {
    expect(commonNameVariant('3- and 4-(4-Hydroxy-4-methylpentyl) cyclohex-3-ene')).toBeNull();
    expect(commonNameVariant('Something (C12-15) Else')).toBeNull();
  });

  it('refuses when there is more than one parenthetical', () => {
    expect(commonNameVariant('Aqua (Water) (Eau)')).toBeNull();
  });

  it('refuses when nothing precedes the insert', () => {
    expect(commonNameVariant('(Jojoba) Seed Oil')).toBeNull();
  });
});
