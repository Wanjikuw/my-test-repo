import { describe, it, expect } from 'vitest';
import {
  GLOSSARY_CITATION,
  partitionAgainstCorpus,
  readGlossaryIdentities,
  repairColumnBreaks,
} from './seed-identity-baseline';
import type { IngredientRecord } from '../../matching/matcher';

const header = 'codedName,INCI name,INN name,Ph. Eur. Name,CAS No\n';

describe('repairColumnBreaks', () => {
  // The Glossary is typeset in two narrow columns and the line breaks survive into the CSV.
  it('rejoins a name broken across a column', () => {
    expect(repairColumnBreaks('ACANTHOPANAX SENTI- COSUS EXTRACT')).toBe(
      'ACANTHOPANAX SENTICOSUS EXTRACT',
    );
    expect(repairColumnBreaks('ACETAMIDOPROPYL TRI- MONIUM CHLORIDE')).toBe(
      'ACETAMIDOPROPYL TRIMONIUM CHLORIDE',
    );
  });

  // A hyphen that belongs to the name has no space after it, which is what separates the
  // two cases. Folding these would invent substances that do not exist.
  it('leaves a hyphen that belongs to the name alone', () => {
    expect(repairColumnBreaks('PEG-8 BEESWAX')).toBe('PEG-8 BEESWAX');
    expect(repairColumnBreaks('C12-15 ALKYL BENZOATE')).toBe('C12-15 ALKYL BENZOATE');
    expect(repairColumnBreaks('QUATERNIUM-15')).toBe('QUATERNIUM-15');
  });

  it('collapses the double spacing the same typesetting leaves behind', () => {
    expect(repairColumnBreaks('ABIETYL  ALCOHOL')).toBe('ABIETYL ALCOHOL');
  });
});

describe('readGlossaryIdentities', () => {
  it('reads one identity per distinct name', () => {
    const csv = `${header}L1,GLYCERIN,,,56-81-5\nL2,XANTHAN GUM,,,11138-66-2\n`;
    expect(readGlossaryIdentities(csv).map((i) => i.inciName)).toEqual(['GLYCERIN', 'XANTHAN GUM']);
  });

  it('repairs a column break before deduplicating, so the two forms become one row', () => {
    const csv = `${header}L1,ACANTHOPANAX SENTI- COSUS EXTRACT,,,\nL2,ACANTHOPANAX SENTICOSUS EXTRACT,,,\n`;
    expect(readGlossaryIdentities(csv)).toEqual([{ inciName: 'ACANTHOPANAX SENTICOSUS EXTRACT' }]);
  });

  it('deduplicates on the matcher key, not on the printed string', () => {
    const csv = `${header}L1,GLYCERIN,,,56-81-5\nL2,Glycerin,,,56-81-5\n`;
    expect(readGlossaryIdentities(csv)).toHaveLength(1);
  });

  it('skips blank and single-character names', () => {
    const csv = `${header}L1,,,,\nL2,X,,,\nL3,GLYCERIN,,,56-81-5\n`;
    expect(readGlossaryIdentities(csv)).toEqual([{ inciName: 'GLYCERIN' }]);
  });

  it('refuses a CSV that is not the glossary rather than guessing a column', () => {
    expect(() => readGlossaryIdentities('name,cas\nGLYCERIN,56-81-5\n')).toThrow(/INCI name/);
  });
});

describe('partitionAgainstCorpus', () => {
  const cited: IngredientRecord[] = [
    {
      id: '1',
      inciName: 'Linalool',
      aliases: [],
      regulatoryStatus: 'restricted',
      sourceCitation: 'Regulation (EC) No 1223/2009, Annex III entry 84',
      riskTags: [{ riskCategory: 'fragrance_allergen', sourceCitation: 'Annex III entry 84' }],
    },
    {
      id: '2',
      inciName: 'Theobroma Cacao (Cocoa) Seed Butter',
      aliases: [],
      regulatoryStatus: 'none',
      sourceCitation: 'PMID 18058303',
      riskTags: [{ riskCategory: 'comedogenic', sourceCitation: 'PMID 18058303' }],
    },
  ];

  // A bulk identity import must never be able to restate a cited Annex entry. The citation
  // is the whole basis of the dataset, and the Glossary is explicitly not a risk source.
  it('holds back a name the cited corpus already resolves', () => {
    const { fresh, alreadyKnown } = partitionAgainstCorpus(
      [{ inciName: 'LINALOOL' }, { inciName: 'GLYCERIN' }],
      cited,
    );
    expect(alreadyKnown.map((i) => i.inciName)).toEqual(['LINALOOL']);
    expect(fresh.map((i) => i.inciName)).toEqual(['GLYCERIN']);
  });

  // Resolution runs through the real matcher, so a name the corpus reaches only by a
  // weaker strategy is still protected.
  it('holds back a name the corpus reaches by a derived key', () => {
    const { alreadyKnown } = partitionAgainstCorpus([{ inciName: 'COCOA SEED BUTTER' }], cited);
    expect(alreadyKnown).toHaveLength(1);
  });

  it('passes everything through when the corpus is empty', () => {
    const { fresh } = partitionAgainstCorpus([{ inciName: 'GLYCERIN' }], []);
    expect(fresh).toHaveLength(1);
  });
});

describe('the identity citation', () => {
  // Section 2d measures the Glossary's Restriction column as unusable, and it predates
  // Regulation 1223/2009 entirely. The citation has to say what it does and does not carry.
  it('says it establishes identity and not risk', () => {
    expect(GLOSSARY_CITATION).toContain('96/335/EC');
    expect(GLOSSARY_CITATION).toMatch(/identity only/i);
    expect(GLOSSARY_CITATION).toMatch(/nothing about its risk/i);
  });
});
