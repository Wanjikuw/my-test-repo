import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  primaryKey,
  integer,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Risk category enum — must stay in sync with RiskCategory in
 * packages/shared/src/scoring.ts. If you add a category there, add it here too.
 */
export const riskCategoryEnum = pgEnum('risk_category', [
  'fragrance_allergen',
  'preservative_sensitizer',
  'common_irritant',
  'comedogenic',
  'photosensitizing',
]);

/**
 * Regulatory status enum — must stay in sync with RegulatoryStatus in
 * packages/shared/src/scoring.ts. Kept separate from risk_category on purpose:
 * Annex III restricts, Annex II forbids, and the two must not be collapsed.
 */
export const regulatoryStatusEnum = pgEnum('regulatory_status', [
  'none',
  'restricted',
  'prohibited',
  'prohibited_as_fragrance',
]);

/**
 * Skin type enum — must stay in sync with SkinType in packages/shared/src/scoring.ts.
 * Previously a bare varchar, which let a typo insert cleanly and then silently never
 * match, making precedence rule 5 fail closed with no error anywhere.
 */
export const skinTypeEnum = pgEnum('skin_type', [
  'dry',
  'oily',
  'combination',
  'sensitive',
  'normal',
]);

export const ingredients = pgTable('ingredients', {
  id: uuid('id').primaryKey().defaultRandom(),
  inciName: text('inci_name').notNull().unique(),
  aliases: text('aliases').array().notNull().default([]),
  fn: text('function'),
  cosingId: varchar('cosing_id', { length: 64 }),
  regulatoryStatus: regulatoryStatusEnum('regulatory_status').notNull().default('none'),
  sourceCitation: text('source_citation').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * One row per (ingredient, risk_category) pair — an ingredient can carry multiple tags
 * (e.g. an essential oil can be both fragrance_allergen and photosensitizing).
 * Every row MUST have its own source_citation per rubric doc Section 3.2 —
 * do not default this to the parent ingredient's citation; the citation for
 * "this is an ingredient" and "this is risky for reason X" are often different sources.
 */
export const ingredientRiskTags = pgTable(
  'ingredient_risk_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id, { onDelete: 'cascade' }),
    riskCategory: riskCategoryEnum('risk_category').notNull(),
    sourceCitation: text('source_citation').notNull(),
    notes: text('notes'),
  },
  // Without this, re-running the seed script silently duplicates every tag.
  (table) => [
    uniqueIndex('ingredient_risk_tags_ingredient_category_key').on(
      table.ingredientId,
      table.riskCategory,
    ),
  ],
);

export const skinTypeSensitivity = pgTable(
  'skin_type_sensitivity',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    skinType: skinTypeEnum('skin_type').notNull(),
    riskCategory: riskCategoryEnum('risk_category').notNull(),
    interactionNote: text('interaction_note').notNull(),
  },
  // Same reason as ingredient_risk_tags: without this, re-running the seed duplicates rows,
  // and a duplicated pair would repeat the same explanation in every scored result.
  (table) => [
    uniqueIndex('skin_type_sensitivity_type_category_key').on(table.skinType, table.riskCategory),
  ],
);

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  brand: text('brand'),
  source: varchar('source', { length: 64 }).notNull(), // 'open_beauty_facts' | 'manual_entry' | 'ocr_scan'
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const productIngredients = pgTable(
  'product_ingredients',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    ingredientId: uuid('ingredient_id')
      .notNull()
      .references(() => ingredients.id, { onDelete: 'restrict' }),
    positionInList: integer('position_in_list').notNull(),
  },
  (table) => [primaryKey({ columns: [table.productId, table.ingredientId] })],
);
