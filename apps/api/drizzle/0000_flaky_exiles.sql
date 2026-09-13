CREATE TYPE "public"."regulatory_status" AS ENUM('none', 'restricted', 'prohibited', 'prohibited_as_fragrance');--> statement-breakpoint
CREATE TYPE "public"."risk_category" AS ENUM('fragrance_allergen', 'preservative_sensitizer', 'common_irritant', 'comedogenic', 'photosensitizing');--> statement-breakpoint
CREATE TABLE "ingredient_risk_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"risk_category" "risk_category" NOT NULL,
	"source_citation" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inci_name" text NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"function" text,
	"cosing_id" varchar(64),
	"regulatory_status" "regulatory_status" DEFAULT 'none' NOT NULL,
	"source_citation" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ingredients_inci_name_unique" UNIQUE("inci_name")
);
--> statement-breakpoint
CREATE TABLE "product_ingredients" (
	"product_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"position_in_list" integer NOT NULL,
	CONSTRAINT "product_ingredients_product_id_ingredient_id_pk" PRIMARY KEY("product_id","ingredient_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"source" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skin_type_sensitivity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skin_type" varchar(32) NOT NULL,
	"risk_category" "risk_category" NOT NULL,
	"interaction_note" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ingredient_risk_tags" ADD CONSTRAINT "ingredient_risk_tags_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_risk_tags_ingredient_category_key" ON "ingredient_risk_tags" USING btree ("ingredient_id","risk_category");