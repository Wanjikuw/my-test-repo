# Phase 1 — Data Sourcing and Scoring Rubric

**Status:** Draft v0.1 — structural sections complete, citation tables OPEN
**Owner:** Wanjiku Wakiama Kaimuri
**Last updated:** 2026-09-03

This document is the specification the code already references. `apps/api/src/db/schema.ts`,
`packages/shared/src/scoring.ts`, `apps/api/src/db/seed/curated-risk-data.ts` and
`apps/api/src/db/seed/import-open-beauty-facts.ts` all cite it by section number, so the
section numbering below is load-bearing — do not renumber without updating those files.

It doubles as source material for Chapter 3 (Methodology) and Chapter 4 (Implementation)
of the report.

---

## 1. Purpose and the central methodological claim

No free dataset provides ready-made cosmetic allergy risk scores. This project therefore
**builds its own risk-tagging layer** on top of public ingredient identity data.

This is the single most important thing to state plainly in the report. It is a legitimate
and expected contribution, but it must be visible as a design decision rather than
presented as if the risk ratings were found in a source dataset. Every risk tag carries its
own citation for exactly this reason (Section 3.2).

The system makes **no medical claim**. It reports what documented sources say about an
ingredient and how that intersects with a user's declared profile. Wording in the UI must
stay consistent with that limit.

---

## 2. Data sources

### 2a. Ingredient identity and function — EU CosIng

CosIng supplies INCI name, function, and identifiers. It is **not** used for risk.

Two constraints found when sourcing it, both of which belong in the report:

1. **CosIng is a search interface, not a bulk export.** The original plan assumed a
   bulk download. The current Commission site exposes a search UI; no bulk export
   endpoint was located. Ingestion strategy is an open item (Section 6).
2. **CosIng has no legal force.** The Commission states it is _"a non-legally binding
   information database"_ and that _"only Regulation (EC) No 1223/2009 and its Annexes
   establish whether, and under which conditions, substances may be used."_

Consequence: CosIng is authoritative for _identity_, the Annexes are authoritative for
_restriction status_. The two must not be conflated. This split is why `ingredients` and
`ingredient_risk_tags` are separate tables with separate citations.

Source: <https://single-market-economy.ec.europa.eu/sectors/cosmetics/cosmetic-ingredient-database_en>

### 2b. Product corpus — Open Beauty Facts

Used to populate `products` with real ingredient strings for testing the matcher against
realistic input, including messy real-world formatting.

The importer filters to skincare-relevant categories with a non-empty `ingredients_text`.
The scaffold records this as yielding **~1,552 usable rows of 64,237**.

> ⚠ This figure was inherited from the scaffold and has **not been independently
> re-verified** in this repo. Re-run `pnpm --filter @allergy-checker/api seed:obf` against
> the current export and record the actual number before citing it in the report.

The importer deliberately does not create `ingredients` rows — mapping product text to
canonical ingredients is matching logic (Section 4.1), not import logic.

### 2c. Risk layer — regulatory and literature sources

Split by strength of evidence, which is what Section 3.1's category grouping encodes.

| Tier               | Basis                                                         | Categories                                           |
| ------------------ | ------------------------------------------------------------- | ---------------------------------------------------- |
| Regulation-backed  | EU Regulation (EC) 1223/2009 Annex III; FDA cosmetic guidance | `fragrance_allergen`, `preservative_sensitizer`      |
| Literature-curated | Named peer-reviewed sources, per entry                        | `common_irritant`, `comedogenic`, `photosensitizing` |

> ⚠ **OPEN — blocking Phase 5.** The Annex III fragrance allergen list is not yet in the
> repo. EUR-Lex returns HTTP 202 with an empty body to automated requests (bot
> mitigation), so it must be retrieved manually. See Section 6.

---

## 3. Risk taxonomy

### 3.1 Categories

Five categories, fixed. Defined once in `packages/shared/src/scoring.ts` as
`RiskCategory` and mirrored in the `risk_category` Postgres enum in
`apps/api/src/db/schema.ts`. **Adding a category means editing both.**

| Category                  | Meaning                                                  |
| ------------------------- | -------------------------------------------------------- |
| `fragrance_allergen`      | Individually-labelled fragrance allergen under Annex III |
| `preservative_sensitizer` | Preservative with documented contact sensitisation       |
| `common_irritant`         | Literature-documented irritant                           |
| `comedogenic`             | Literature-documented pore-occluding potential           |
| `photosensitizing`        | Increases photosensitivity                               |

An ingredient may hold several tags — an essential oil can be both `fragrance_allergen`
and `photosensitizing`. Hence `ingredient_risk_tags` is one row per
(ingredient, category) pair, with a unique index preventing the seed script from
silently duplicating tags on re-run.

### 3.2 Citation requirements

**Every risk tag carries its own `source_citation`. It is `NOT NULL`.**

The citation for _"this substance exists and is called X"_ and for _"X is risky for
reason Y"_ are usually different sources. A tag must never inherit its parent
ingredient's citation. This is the rule that makes the risk layer defensible.

Practically: if you cannot name a source for a tag, the tag does not get added.

---

## 4. Matching and scoring

Matching and scoring are strictly separate. The scoring function consumes `MatchResult`
and nothing else, so it can be unit-tested without a database — which matters because
scoring is the highest-stakes logic in the project.

### 4.1 Matching

Input: raw ingredient strings (typed, pasted, or OCR-extracted).
Output: `MatchResult` — `matches[]` plus `unmatched[]`.

Each `IngredientMatch` carries `riskCategories`, `sourceCitation`, and
`userDeclaredAllergyMatch`, the last being an exact hit against the user's own declared
allergy list.

Matching must handle: case and punctuation variation, `parfum`/`fragrance` synonymy,
aliases (the `ingredients.aliases` array), and near-miss spellings from OCR. Anything
not confidently matched goes to `unmatched` — it is **never silently dropped**, because
an unrecognised ingredient is exactly the case a user needs told about.

### 4.2 Result tiers and precedence

Four tiers, severity ordered:

```
Avoid  >  Caution  >  UnverifiedCaution  >  Safe
```

Evaluated as a rule tree, highest matching rule wins. A rule tree was chosen over a
weighted numeric sum because it is explainable: every verdict traces to a specific
triggering ingredient, which the "explain the risk in plain language" objective requires.
A weighted sum would produce a number nobody could justify to a user.

| Precedence | Tier                | Trigger                                                                                         |
| ---------- | ------------------- | ----------------------------------------------------------------------------------------------- |
| 1          | `Avoid`             | Any ingredient matches the user's declared allergy list (`userDeclaredAllergyMatch === true`)   |
| 2          | `Avoid`             | Any ingredient carries a regulation-backed tag conflicting with the user's declared sensitivity |
| 3          | `Caution`           | Any ingredient carries a risk tag relevant to the user's skin type, via `skin_type_sensitivity` |
| 4          | `UnverifiedCaution` | One or more ingredients are `unmatched` and no higher rule fired                                |
| 5          | `Safe`              | All ingredients matched, none triggered a rule                                                  |

`UnverifiedCaution` exists so an unrecognised ingredient is never reported as `Safe`.
Absence of evidence is not evidence of safety, and conflating the two would be the most
damaging failure this system could make.

Every tier returns `explanations[]` naming the ingredient, a plain-language reason, and
the citation. A tier without an explanation is a bug.

### 4.3 Worked examples

To be turned directly into Vitest cases in Phase 5.

| #   | Profile              | Ingredients                   | Expected                         |
| --- | -------------------- | ----------------------------- | -------------------------------- |
| 1   | Allergic to Linalool | `Aqua, Glycerin, Linalool`    | `Avoid` — rule 1                 |
| 2   | Sensitive skin       | `Aqua, Methylisothiazolinone` | `Avoid` — rule 2                 |
| 3   | Oily skin            | `Aqua, Coconut Oil`           | `Caution` — rule 3, comedogenic  |
| 4   | Empty profile        | `Aqua, Glycerin`              | `Safe` — rule 5                  |
| 5   | Empty profile        | `Aqua, Xyzzyne`               | `UnverifiedCaution` — rule 4     |
| 6   | Allergic to Linalool | `Aqua, Linalool, Xyzzyne`     | `Avoid` — rule 1 outranks rule 4 |

Case 6 is the tie-break that fixes the severity ordering: a declared-allergy hit must not
be masked by an unknown ingredient.

---

## 5. Versioning

The dataset is versioned with the repo. Any change to a risk tag or to the rules in
Section 4.2 requires a Conventional Commit describing what changed and why, so the report
can reconstruct the decision history.

---

## 6. Open items

| #   | Item                                                                        | Blocks           | Owner   |
| --- | --------------------------------------------------------------------------- | ---------------- | ------- |
| 1   | Retrieve Annex III fragrance allergen list (EUR-Lex blocks automation)      | Phase 5          | Wanjiku |
| 2   | Decide CosIng ingestion route now that no bulk export was found             | Phase 4 matching | Wanjiku |
| 3   | Build the three literature-curated lists with per-entry citations           | Phase 5          | Wanjiku |
| 4   | Re-verify the Open Beauty Facts row count in Section 2b                     | Report accuracy  | Wanjiku |
| 5   | Populate `skin_type_sensitivity` — currently no rows, so rule 3 cannot fire | Phase 5          | Wanjiku |

Item 5 is easy to miss: the table exists in the schema but has no seed data, so
precedence rule 3 is unreachable until it is populated.
