/**
 * Curated seed data for the two regulation/guidance-backed risk categories
 * (rubric doc Section 3.2 — these are the strongest citations available; the other
 * three categories, common_irritant/comedogenic/photosensitizing, need a separate
 * curated list built from cited literature — NOT included here, see TODO below).
 *
 * This is a STARTING list, not exhaustive. Expand it as you go through CosIng.
 * Every entry needs a real citation — do not add an ingredient here without one.
 */

export type CuratedRiskEntry = {
  inciName: string;
  riskCategory: 'fragrance_allergen' | 'preservative_sensitizer';
  sourceCitation: string;
  notes?: string;
};

export const curatedFragranceAllergens: CuratedRiskEntry[] = [
  // A representative starting subset of the EU Annex III individually-labelled
  // fragrance allergens (24 required as of this writing, expanding to 80 through
  // 2026–2028 per Regulation (EU) 2023/1545). Pull the FULL list from the official
  // Annex III text before treating this as complete — do not ship with only this subset.
  {
    inciName: 'Linalool',
    riskCategory: 'fragrance_allergen',
    sourceCitation: 'EU Regulation (EC) 1223/2009, Annex III',
  },
  {
    inciName: 'Limonene',
    riskCategory: 'fragrance_allergen',
    sourceCitation: 'EU Regulation (EC) 1223/2009, Annex III',
  },
  {
    inciName: 'Citronellol',
    riskCategory: 'fragrance_allergen',
    sourceCitation: 'EU Regulation (EC) 1223/2009, Annex III',
  },
  {
    inciName: 'Geraniol',
    riskCategory: 'fragrance_allergen',
    sourceCitation: 'EU Regulation (EC) 1223/2009, Annex III',
  },
  {
    inciName: 'Eugenol',
    riskCategory: 'fragrance_allergen',
    sourceCitation: 'EU Regulation (EC) 1223/2009, Annex III',
  },
  // TODO: add the remaining ~19 currently-required entries, then the 56 added by
  // Regulation (EU) 2023/1545 as they phase in — this is Phase 1 build work, not
  // something to leave for later.
];

export const curatedPreservativeSensitizers: CuratedRiskEntry[] = [
  {
    inciName: 'Methylisothiazolinone',
    riskCategory: 'preservative_sensitizer',
    sourceCitation: 'FDA cosmetic ingredient guidance',
    notes: 'Documented contact sensitizer, restricted concentration in leave-on products',
  },
  {
    inciName: 'DMDM Hydantoin',
    riskCategory: 'preservative_sensitizer',
    sourceCitation: 'FDA cosmetic ingredient guidance',
    notes: 'Formaldehyde-releaser',
  },
  {
    inciName: 'Quaternium-15',
    riskCategory: 'preservative_sensitizer',
    sourceCitation: 'FDA cosmetic ingredient guidance',
    notes: 'Formaldehyde-releaser',
  },
  // TODO: expand from FDA guidance + formaldehyde-releaser reference lists.
];

// TODO (Phase 1, still open per rubric doc Section 3.2): build curatedCommonIrritants,
// curatedComedogenic, and curatedPhotosensitizing lists, each with named literature
// citations per entry — these three do not have a single regulatory source to lean on,
// so this is genuine research work, not a data-entry task.
