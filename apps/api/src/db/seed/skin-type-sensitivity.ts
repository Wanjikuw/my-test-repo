/**
 * Which risk categories matter for which skin type — the data behind precedence rule 5
 * (rubric Section 4.2). One row per (skin_type, risk_category) pair.
 *
 * `interaction_note` is not decoration. It is the sentence the user is shown when the rule
 * fires, so it has to explain the mechanism rather than restate the tag.
 *
 * Scope note: `normal` deliberately has no rows. A normal skin type is the absence of a
 * known predisposition, and inventing sensitivities for it would make rule 5 fire for
 * everyone, which would make a Caution meaningless.
 *
 * Three of the five risk categories (`common_irritant`, `comedogenic`, `photosensitizing`)
 * currently have no tagged ingredients, so the rows referencing them are seeded but cannot
 * fire yet. They activate without a migration once rubric open item 5 is done.
 */
import type { RiskCategory, SkinType } from '@allergy-checker/shared';

export type SkinTypeSensitivityEntry = {
  skinType: SkinType;
  riskCategory: RiskCategory;
  interactionNote: string;
};

export const skinTypeSensitivities: SkinTypeSensitivityEntry[] = [
  {
    skinType: 'sensitive',
    riskCategory: 'fragrance_allergen',
    interactionNote:
      'Fragrance allergens are the most frequent cause of cosmetic contact allergy, and sensitised skin can react below the concentrations that require labelling.',
  },
  {
    skinType: 'sensitive',
    riskCategory: 'preservative_sensitizer',
    interactionNote:
      'Preservative sensitisers are a leading cause of allergic contact dermatitis from leave-on products, and reactivity persists once established.',
  },
  {
    skinType: 'sensitive',
    riskCategory: 'common_irritant',
    interactionNote:
      'Sensitive skin has a lower irritation threshold, so an ingredient tolerated by most people can still provoke stinging or redness.',
  },
  {
    skinType: 'dry',
    riskCategory: 'common_irritant',
    interactionNote:
      'A dry, compromised barrier lets irritants penetrate further than they would through intact skin.',
  },
  {
    skinType: 'dry',
    riskCategory: 'fragrance_allergen',
    interactionNote:
      'Fragrance compounds are volatile and solvent-like, which further strips an already weakened lipid barrier.',
  },
  {
    skinType: 'oily',
    riskCategory: 'comedogenic',
    interactionNote:
      'Comedogenic ingredients occlude follicles that are already producing excess sebum, which is the condition comedones form under.',
  },
  {
    skinType: 'combination',
    riskCategory: 'comedogenic',
    interactionNote:
      'Combination skin has oil-prone zones where follicular occlusion behaves as it does on oily skin, even though other areas are unaffected.',
  },
];
