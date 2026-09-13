CREATE TYPE "public"."skin_type" AS ENUM('dry', 'oily', 'combination', 'sensitive', 'normal');--> statement-breakpoint
-- USING added by hand: drizzle-kit emits a bare SET DATA TYPE, and Postgres refuses to
-- cast varchar to an enum without an explicit conversion (42804). Any existing value that
-- is not a valid label will abort the migration, which is the behaviour we want.
ALTER TABLE "skin_type_sensitivity" ALTER COLUMN "skin_type" SET DATA TYPE skin_type USING "skin_type"::"public"."skin_type";--> statement-breakpoint
CREATE UNIQUE INDEX "skin_type_sensitivity_type_category_key" ON "skin_type_sensitivity" USING btree ("skin_type","risk_category");