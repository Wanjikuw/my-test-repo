import { describe, expect, it } from 'vitest';
import { cleanOcrText } from './ocr-text';

describe('cleanOcrText', () => {
  it('rejoins a list the pack wrapped across lines', () => {
    expect(cleanOcrText('Aqua, Glycerin, Butyrospermum\nParkii Butter, Linalool')).toBe(
      'Aqua, Glycerin, Butyrospermum Parkii Butter, Linalool',
    );
  });

  it('removes a hyphen the typesetter added to wrap a word', () => {
    expect(cleanOcrText('Aqua, 1,2-Hexa-\nnediol')).toBe('Aqua, 1,2-Hexanediol');
  });

  it('keeps a hyphen that belongs to the name', () => {
    expect(cleanOcrText('Aqua, PEG-\n40 Hydrogenated Castor Oil')).toBe(
      'Aqua, PEG-40 Hydrogenated Castor Oil',
    );
  });

  it('treats line breaks as separators when the list has no commas at all', () => {
    expect(cleanOcrText('Aqua\nGlycerin\nLinalool')).toBe('Aqua, Glycerin, Linalool');
  });

  it('keeps a sentence break, so text after the list does not fuse onto the last name', () => {
    expect(cleanOcrText('Aqua, Linalool.\nMade in France')).toBe('Aqua, Linalool.\nMade in France');
  });

  it('drops the code fence a model may wrap its answer in', () => {
    expect(cleanOcrText('```\nAqua, Glycerin\n```')).toBe('Aqua, Glycerin');
  });

  it('tidies the spacing OCR leaves around commas', () => {
    expect(cleanOcrText('Aqua ,  Glycerin')).toBe('Aqua, Glycerin');
  });

  it('returns nothing for nothing', () => {
    expect(cleanOcrText('  \n \n')).toBe('');
  });
});
