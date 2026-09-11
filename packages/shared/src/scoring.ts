import { z } from 'zod';

/**
 * Risk categories per the finalized taxonomy (Phase1_Data_Sourcing_and_Scoring_Rubric.md, Section 3.1).
 * fragrance_allergen and preservative_sensitizer are regulation/guidance-backed.
 * common_irritant, comedogenic, and photosensitizing are literature-curated —
 * each entry in the ingredients table must carry its own source_citation.
 */
export const RiskCategory = z.enum([
  'fragrance_allergen',
  'preservative_sensitizer',
  'common_irritant',
  'comedogenic',
  'photosensitizing',
]);
export type RiskCategory = z.infer<typeof RiskCategory>;

/**
 * Regulatory status under Regulation (EC) No 1223/2009 (rubric Section 3.3).
 * Deliberately NOT a RiskCategory: a risk category says why a substance is risky to a
 * person and feeds the skin-profile rules, whereas this says whether the product may
 * lawfully be sold at all, which is independent of who is using it. Annex III restricts,
 * Annex II forbids, and rubric Section 2f requires the engine to keep the two apart.
 *
 * `prohibited_as_fragrance` is conditional: the ban applies only to the fragrance role,
 * which an ingredient list cannot establish. It must never be scored as an outright ban.
 */
export const RegulatoryStatus = z.enum([
  'none',
  'restricted',
  'prohibited',
  'prohibited_as_fragrance',
]);
export type RegulatoryStatus = z.infer<typeof RegulatoryStatus>;

/**
 * Result tiers per the rubric doc, Section 4.2.
 * Severity ordering (most to least severe) is Avoid > Caution > UnverifiedCaution > Safe.
 * This ordering is enforced in the scoring engine's tie-breaking logic, not here —
 * this file only defines the shape, not the resolution logic.
 */
export const ResultTier = z.enum(['Avoid', 'Caution', 'UnverifiedCaution', 'Safe']);
export type ResultTier = z.infer<typeof ResultTier>;

export const IngredientMatch = z.object({
  ingredientId: z.string(),
  inciName: z.string(),
  riskCategories: z.array(RiskCategory),
  regulatoryStatus: RegulatoryStatus,
  sourceCitation: z.string(),
  userDeclaredAllergyMatch: z.boolean(),
});
export type IngredientMatch = z.infer<typeof IngredientMatch>;

export const UnmatchedIngredient = z.object({
  rawText: z.string(),
});
export type UnmatchedIngredient = z.infer<typeof UnmatchedIngredient>;

/**
 * Output of the matching step (Section 4.1) — separate from scoring.
 * The scoring function consumes exactly this shape and nothing else.
 */
export const MatchResult = z.object({
  matches: z.array(IngredientMatch),
  unmatched: z.array(UnmatchedIngredient),
});
export type MatchResult = z.infer<typeof MatchResult>;

export const ScoredResult = z.object({
  tier: ResultTier,
  explanations: z.array(
    z.object({
      ingredientName: z.string(),
      message: z.string(),
      sourceCitation: z.string().optional(),
    }),
  ),
});
export type ScoredResult = z.infer<typeof ScoredResult>;
