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
 * Skin types the profile supports. Mirrored in the `skin_type` Postgres enum.
 * `normal` is deliberately valid but maps to no sensitivities.
 */
export const SkinType = z.enum(['dry', 'oily', 'combination', 'sensitive', 'normal']);
export type SkinType = z.infer<typeof SkinType>;

/**
 * Categories whose evidence is a regulation rather than literature (rubric Section 2c).
 * Precedence rule 3 escalates only these, because it turns a Caution into an Avoid and
 * that is only defensible where a regulator, not a paper, established the risk.
 */
export const REGULATION_BACKED_CATEGORIES: readonly RiskCategory[] = [
  'fragrance_allergen',
  'preservative_sensitizer',
];

/**
 * Result tiers per the rubric doc, Section 4.2.
 * Severity ordering (most to least severe) is Avoid > Caution > UnverifiedCaution > Safe,
 * encoded in TIER_SEVERITY below and applied by `score`.
 */
export const ResultTier = z.enum(['Avoid', 'Caution', 'UnverifiedCaution', 'Safe']);
export type ResultTier = z.infer<typeof ResultTier>;

/** Higher wins. The only place the tier ordering is defined. */
export const TIER_SEVERITY: Record<ResultTier, number> = {
  Safe: 0,
  UnverifiedCaution: 1,
  Caution: 2,
  Avoid: 3,
};

/**
 * A risk tag the matcher resolved as relevant to this user's skin type, carrying the
 * `interaction_note` from `skin_type_sensitivity` so the explanation has real text.
 * Resolved during matching, not scoring — same pattern as userDeclaredAllergyMatch,
 * which is what keeps the scoring function free of any database access.
 */
export const SkinTypeConflict = z.object({
  riskCategory: RiskCategory,
  interactionNote: z.string(),
});
export type SkinTypeConflict = z.infer<typeof SkinTypeConflict>;

export const IngredientMatch = z.object({
  ingredientId: z.string(),
  inciName: z.string(),
  riskCategories: z.array(RiskCategory),
  regulatoryStatus: RegulatoryStatus,
  skinTypeConflicts: z.array(SkinTypeConflict),
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
 * The scoring function consumes exactly this shape and nothing else, so `skinType` and
 * the resolved conflicts travel on it rather than as extra arguments.
 */
export const MatchResult = z.object({
  skinType: SkinType.nullable(),
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

type Explanation = ScoredResult['explanations'][number];

/** Subject used for the Safe verdict, which has no triggering ingredient to name. */
const NO_TRIGGER_SUBJECT = 'All ingredients';

/**
 * Plain-language rendering of each category. Explanations are shown to users, and
 * Section 4.2 requires a plain-language reason, so the raw enum name never appears.
 */
const CATEGORY_LABEL: Record<RiskCategory, string> = {
  fragrance_allergen: 'a declarable fragrance allergen',
  preservative_sensitizer: 'a preservative known to cause contact sensitisation',
  common_irritant: 'a documented irritant',
  comedogenic: 'known to block pores',
  photosensitizing: 'able to increase sensitivity to sunlight',
};

/**
 * Evaluates the precedence tree in rubric Section 4.2. The highest-precedence rule that
 * fires sets the tier, but every rule that fires contributes an explanation, so a verdict
 * always names what drove it.
 *
 * Pure by construction: no database, no I/O, no clock. Everything user-specific
 * (`userDeclaredAllergyMatch`, `skinTypeConflicts`, `skinType`) was resolved during
 * matching, which is what makes the highest-stakes logic in the project testable in
 * isolation.
 */
export function score(result: MatchResult): ScoredResult {
  const explanations: Explanation[] = [];
  const fired: ResultTier[] = [];

  // Rule 1 — an Annex II ban is a fact about the product, true with no user profile.
  for (const m of result.matches) {
    if (m.regulatoryStatus !== 'prohibited') continue;
    fired.push('Avoid');
    explanations.push({
      ingredientName: m.inciName,
      message: `${m.inciName} is prohibited in cosmetic products. A product listing it should not be on sale.`,
      sourceCitation: m.sourceCitation,
    });
  }

  // Rule 2 — the user's own declared allergy outranks everything except illegality.
  for (const m of result.matches) {
    if (!m.userDeclaredAllergyMatch) continue;
    fired.push('Avoid');
    explanations.push({
      ingredientName: m.inciName,
      message: `${m.inciName} is on your declared allergy list.`,
      sourceCitation: m.sourceCitation,
    });
  }

  // Rule 3 — sensitive skin escalates a regulation-backed tag from Caution to Avoid.
  const escalated = new Set<string>();
  if (result.skinType === 'sensitive') {
    for (const m of result.matches) {
      const backed = m.riskCategories.filter((c) => REGULATION_BACKED_CATEGORIES.includes(c));
      if (backed.length === 0) continue;
      for (const c of backed) escalated.add(`${m.ingredientId}:${c}`);
      fired.push('Avoid');
      explanations.push({
        ingredientName: m.inciName,
        message: `${m.inciName} is ${backed.map((c) => CATEGORY_LABEL[c]).join(' and ')}, and you reported sensitive skin.`,
        sourceCitation: m.sourceCitation,
      });
    }
  }

  // Rule 4 — the ban is real but conditional on a role the label does not state,
  // so it warns rather than asserting the product is non-compliant.
  for (const m of result.matches) {
    if (m.regulatoryStatus !== 'prohibited_as_fragrance') continue;
    fired.push('Caution');
    explanations.push({
      ingredientName: m.inciName,
      message: `${m.inciName} is prohibited when used as a fragrance ingredient. An ingredient list cannot show which role it was used in here.`,
      sourceCitation: m.sourceCitation,
    });
  }

  // Rule 5 — a risk tag the matcher resolved as relevant to this user's skin type.
  // Anything rule 3 already escalated is skipped: repeating it would show the user two
  // near-identical sentences about one ingredient, and the weaker one adds nothing.
  for (const m of result.matches) {
    for (const conflict of m.skinTypeConflicts) {
      if (escalated.has(`${m.ingredientId}:${conflict.riskCategory}`)) continue;
      fired.push('Caution');
      explanations.push({
        ingredientName: m.inciName,
        message: `${m.inciName} is ${CATEGORY_LABEL[conflict.riskCategory]}. ${conflict.interactionNote}`,
        sourceCitation: m.sourceCitation,
      });
    }
  }

  // Rule 6 — absence of evidence is not evidence of safety.
  for (const u of result.unmatched) {
    fired.push('UnverifiedCaution');
    explanations.push({
      ingredientName: u.rawText,
      message: `${u.rawText} was not recognised, so it could not be checked.`,
    });
  }

  if (fired.length === 0) {
    const n = result.matches.length;
    const message =
      n === 0
        ? 'No ingredients were supplied, so there was nothing to check.'
        : n === 1
          ? 'The single ingredient was recognised and triggered no risk rule.'
          : `All ${n} ingredients were recognised and none triggered a risk rule.`;
    return {
      tier: 'Safe',
      explanations: [{ ingredientName: NO_TRIGGER_SUBJECT, message }],
    };
  }

  const tier = fired.reduce((worst, t) => (TIER_SEVERITY[t] > TIER_SEVERITY[worst] ? t : worst));
  return { tier, explanations };
}
