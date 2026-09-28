import { describe, expect, it } from 'vitest';
import { addIngredient, replaceName } from './label';

describe('replaceName', () => {
  it('replaces a whole entry, never a name inside a longer one', () => {
    expect(replaceName('Coconut Oil, Oil, Aqua', 'Oil', 'OLEA EUROPAEA FRUIT OIL')).toEqual({
      label: 'Coconut Oil, OLEA EUROPAEA FRUIT OIL, Aqua',
      replaced: true,
    });
  });

  it('replaces one part of a name printed with slashes', () => {
    expect(replaceName('Aqua/Water/Eau, Glycerin', 'Eau', 'AQUA').label).toBe(
      'Aqua/Water/AQUA, Glycerin',
    );
  });

  it('matches through whitespace the API collapsed before reporting the name', () => {
    expect(replaceName('Retinal   HPR,\nAqua', 'Retinal HPR', 'X').label).toBe('X,\nAqua');
  });

  it('keeps what was printed after the name, such as a concentration', () => {
    expect(replaceName('Niacinamide 10%, Aqua', 'Niacinamide', 'NIACINAMIDE').label).toBe(
      'NIACINAMIDE 10%, Aqua',
    );
  });

  it('does not treat a longer colour index as the shorter one', () => {
    expect(replaceName('CI 77491, CI 7749', 'CI 7749', 'X').label).toBe('CI 77491, X');
  });

  it('is not thrown by regex characters in the name', () => {
    expect(replaceName('Aqua, Hexa(nediol', 'Hexa(nediol', 'X').label).toBe('Aqua, X');
  });

  it('says so when the name is no longer on the label', () => {
    expect(replaceName('Aqua, Glycerin', 'Xyzzyne', 'X')).toEqual({
      label: 'Aqua, Glycerin',
      replaced: false,
    });
  });
});

describe('addIngredient', () => {
  it('starts the label when there is nothing on it', () => {
    expect(addIngredient('', 'AQUA')).toEqual({ label: 'AQUA', added: true });
  });

  it('separates a pick from existing text with a comma', () => {
    expect(addIngredient('Aqua, Glycerin', 'LINALOOL')).toEqual({
      label: 'Aqua, Glycerin, LINALOOL',
      added: true,
    });
  });

  it('does not double a comma the user already typed', () => {
    expect(addIngredient('Aqua, Glycerin,', 'LINALOOL').label).toBe('Aqua, Glycerin, LINALOOL');
  });

  it('ignores trailing whitespace when deciding on the separator', () => {
    expect(addIngredient('Aqua, Glycerin,  \n', 'LINALOOL').label).toBe('Aqua, Glycerin, LINALOOL');
  });

  it('refuses a name already on the label', () => {
    expect(addIngredient('Aqua, Glycerin', 'Glycerin')).toEqual({
      label: 'Aqua, Glycerin',
      added: false,
    });
  });

  it('treats a repeat differing only by case as a duplicate', () => {
    // The Glossary prints in capitals and labels rarely do, so this is the common case.
    expect(addIngredient('aqua, glycerin', 'GLYCERIN').added).toBe(false);
  });

  it('sees names separated by newlines, as a pasted label often is', () => {
    expect(addIngredient('Aqua\nGlycerin\nTocopherol', 'Glycerin').added).toBe(false);
  });

  it('does not mistake a substring for a duplicate', () => {
    // `Glycerin` is contained in `Glyceryl Stearate`, which is a different substance.
    expect(addIngredient('Glyceryl Stearate', 'Glycerin').added).toBe(true);
  });

  it('trims the incoming name rather than embedding the whitespace', () => {
    expect(addIngredient('Aqua', '  LINALOOL  ').label).toBe('Aqua, LINALOOL');
  });
});
