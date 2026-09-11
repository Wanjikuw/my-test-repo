import { describe, expect, it } from 'vitest';
import { RegulatoryStatus } from '@allergy-checker/shared';
import {
  bannedFormerAllergens,
  prohibitedFragranceIngredients,
  prohibitedSubstances,
  regulatoryStatusFor,
} from './prohibited-substances';
import { curatedFragranceAllergens, dualStatusSubstances } from './curated-risk-data';

describe('prohibited substances', () => {
  it('keeps the three former allergens separate from the restricted dataset', () => {
    expect(bannedFormerAllergens.map((s) => s.annexIIEntry)).toEqual([1380, 1381, 1382]);
  });

  it('only shares a CAS with Annex III where the regulation itself cross-references it', () => {
    const restrictedCas = new Set(curatedFragranceAllergens.flatMap((e) => e.casNumbers));
    const documented = new Set(dualStatusSubstances.map((d) => d.casNumber));
    const undocumented = prohibitedSubstances.filter((s) =>
      s.casNumbers.some((c) => restrictedCas.has(c) && !documented.has(c)),
    );
    expect(undocumented.map((s) => s.name)).toEqual([]);
  });

  it('documents both sides of every dual-status substance', () => {
    const prohibitedCas = new Set(prohibitedSubstances.flatMap((s) => s.casNumbers));
    const restrictedCas = new Set(curatedFragranceAllergens.flatMap((e) => e.casNumbers));
    for (const d of dualStatusSubstances) {
      expect(prohibitedCas.has(d.casNumber)).toBe(true);
      expect(restrictedCas.has(d.casNumber)).toBe(true);
      expect(d.distinction.length).toBeGreaterThan(30);
    }
  });

  it('marks the outright bans as unconditional', () => {
    expect(bannedFormerAllergens.every((s) => !s.prohibitedOnlyAsFragrance)).toBe(true);
  });

  it('marks the fragrance-role bans as conditional', () => {
    expect(prohibitedFragranceIngredients.every((s) => s.prohibitedOnlyAsFragrance)).toBe(true);
  });

  it('cites Annex II, never Annex III', () => {
    for (const s of prohibitedSubstances) {
      expect(s.sourceCitation).toContain('Annex II,');
      expect(s.sourceCitation).toContain(`entry ${s.annexIIEntry}`);
    }
  });

  it('has no duplicate annex entries', () => {
    const entries = prohibitedSubstances.map((s) => s.annexIIEntry);
    expect(new Set(entries).size).toBe(entries.length);
  });

  it('uses well-formed CAS numbers where present', () => {
    for (const s of prohibitedSubstances) {
      for (const cas of s.casNumbers) {
        expect(cas).toMatch(/^\d{2,7}-\d{2}-\d$/);
      }
    }
  });

  it('never scores a fragrance-role ban as an outright ban', () => {
    expect(bannedFormerAllergens.map(regulatoryStatusFor)).toEqual(
      bannedFormerAllergens.map(() => 'prohibited'),
    );
    expect(prohibitedFragranceIngredients.map(regulatoryStatusFor)).toEqual(
      prohibitedFragranceIngredients.map(() => 'prohibited_as_fragrance'),
    );
  });

  it('emits only statuses the shared contract accepts', () => {
    for (const s of prohibitedSubstances) {
      expect(RegulatoryStatus.parse(regulatoryStatusFor(s))).toBe(regulatoryStatusFor(s));
    }
  });
});
