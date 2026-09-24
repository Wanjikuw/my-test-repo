import { describe, expect, it } from 'vitest';
import { addIngredient } from './label';

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
