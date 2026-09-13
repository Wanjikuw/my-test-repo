# Phase 1 — Data Sourcing and Scoring Rubric

**Status:** v0.4 — Annex III entries 67-92 sourced; recall gap closed
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

**Resolved — use the published Glossary rather than scraping CosIng.** The Glossary of
Common Ingredient Names (Decision 96/335/EC) is distributed as a flat file and carries
`INCI name`, `CAS No`, `Chem/IUPAC Name`, `Function` and a `Restriction` column —
**7,662 rows covering 4,970 distinct CAS numbers**. This fills the identity role CosIng
was intended to serve, with no search-UI scraping.

Two limits, both of which belong in the report:

1. It predates Regulation (EC) No 1223/2009, so its `Restriction` column cites the
   repealed Directive 76/768/EEC annexes. Authoritative for **identity**, never for
   current restriction status.
2. Only **154 of 7,662** rows carry any Annex III reference, and spot-checking shows the
   column is incomplete — `AMYL CINNAMAL` and `BENZYL SALICYLATE` are blank despite being
   Annex III allergens. It therefore **cannot** be used to reconstruct entries 67–92.

A newer consolidation exists as Decision (EU) 2019/701; refresh to it before submission.

### 2b. Product corpus — Open Beauty Facts

Used to populate `products` with real ingredient strings for testing the matcher against
realistic input, including messy real-world formatting.

The importer filters to skincare-relevant categories with a non-empty `ingredients_text`.
The scaffold recorded this as yielding ~1,552 usable rows of 64,237. **Re-measured against
the current export: 1,489 of 64,237.**

| Measure                     | Scaffold claim | Measured   |
| --------------------------- | -------------- | ---------- |
| Rows in the export          | 64,237         | **64,237** |
| Passing the skincare filter | ~1,552         | **1,489**  |

The denominator was exact; the numerator was 63 too high, so the inherited figure
overstated usable coverage by about 4 %. Reproduce with:

```bash
pnpm --filter @allergy-checker/api exec tsx src/db/seed/import-open-beauty-facts.ts <csv> --dry-run
```

`--dry-run` applies the filter and reports the count without opening a database
connection, so the figure can be re-checked on any machine without credentials.

The importer deliberately does not create `ingredients` rows — mapping product text to
canonical ingredients is matching logic (Section 4.1), not import logic.

### 2c. Risk layer — regulatory and literature sources

Split by strength of evidence, which is what Section 3.1's category grouping encodes.

| Tier               | Basis                                                         | Categories                                           |
| ------------------ | ------------------------------------------------------------- | ---------------------------------------------------- |
| Regulation-backed  | EU Regulation (EC) 1223/2009 Annex III; FDA cosmetic guidance | `fragrance_allergen`, `preservative_sensitizer`      |
| Literature-curated | Named peer-reviewed sources, per entry                        | `common_irritant`, `comedogenic`, `photosensitizing` |

**Fragrance allergens — sourced.** `curated-risk-data.ts` is transcribed from the full text
of Commission Regulation (EU) 2023/1545 (OJ L 188, 27.7.2023, p. 1; CELEX:32023R1545),
which amends Annex III. Every entry carries its own Annex III reference number, so each
risk tag cites a specific provision rather than "Annex III" generally.

| Set                        | Count  | Annex III entries                                                             |
| -------------------------- | ------ | ----------------------------------------------------------------------------- |
| Substituted by 2023/1545   | 17     | 45, 46, 70, 73, 86, 88, 109, 114, 122, 124, 131, 133, 154, 157, 175, 196, 324 |
| Added by 2023/1545         | 45     | 327–371                                                                       |
| **Seeded total**           | **62** |                                                                               |
| Repealed — must never seed | 10     | 125, 126, 158, 160–163, 165, 167, 168                                         |

The amendment map was cross-checked against the CELLAR metadata notice for the act, whose
`RESOURCE_LEGAL_AMENDS_RESOURCE_LEGAL` annotations list the same substituted / added /
deleted entry numbers. Two independent sources agreeing is why these counts are stated
without hedging. The counts are asserted in `curated-risk-data.test.ts`, so a transcription
slip fails CI rather than silently degrading the engine.

Disclosure threshold is uniform across all 62: **0,001 % leave-on, 0,01 % rinse-off**
(Article 19(1)(g)).

> ⚠ **Still open — the pre-existing allergens in entries 67–92.** Recital 5 states the
> current 24 individually-labelled allergens sit in "entries 45 and 67 to 92". An amending
> act only reproduces entries it changes, so those 2023/1545 left untouched — including
> **Linalool, Geraniol, Eugenol, Coumarin, Cinnamal** — are absent from our source text and
> are deliberately **not** in the dataset. They require the consolidated Annex III
> (CELEX:02009R1223). Until then the engine cannot flag them: a known false-negative class
> that must be declared as a limitation in the report.

> ⚠ **Corrigenda not yet reconciled.** `32023R1545R(01)` (2024-08-16) is Slovak-only and
> harmless here. `32023R1545R(02)` (2025-11-07, OJ L_202590876) states no language
> restriction and may alter the English text. Check it before the dataset is called final.

**Compliance is still phasing in.** Non-conforming products could be placed on the market
until **2026-07-31** and made available until **2028-07-31**. A product on sale today may
lawfully omit these declarations, so _absence of a declared allergen is not evidence of
absence_. The UI must not imply otherwise.

### 2d. External validation and measured recall

Two properties were measured against independent data rather than asserted. Both are
reproducible and belong in Chapter 4.

**Transcription accuracy.** `apps/api/src/db/seed/validate-identity.ts` corroborates the
62 seeded entries by CAS number against two independent EU identity sources:

| Source                                                         | Rows  | Entries confirmed by CAS |
| -------------------------------------------------------------- | ----- | ------------------------ |
| EU Glossary of Common Ingredient Names (Decision 96/335/EC)    | 7,662 | 45 / 62                  |
| NORMAN cosmetics set (Decision 2006/257/EC + SCCNFP INCI 2000) | 3,333 | 32 / 62                  |
| **Union of both**                                              |       | **59 / 62**              |

| Result                                                    | Count |
| --------------------------------------------------------- | ----- |
| Corroborated by exact CAS match                           | 59    |
| **Conflicting match (resolved to a different substance)** | **0** |
| Matched on name only (weaker evidence)                    | 0     |
| Not corroborated by any source                            | 3     |

**Zero conflicts is the finding that matters.** A wrong CAS digit that still resolves to a
real but different substance is the error a manual transcription actually produces, and it
would be invisible at runtime. None occurred.

The three uncorroborated entries are explicable rather than suspect:

| Entry | Substance          | Why absent                                                                          |
| ----- | ------------------ | ----------------------------------------------------------------------------------- |
| 109   | Pinus Mugo         | Botanical extract; not a discrete structure, so absent from chemical reference sets |
| 327   | Acetyl Cedrene     | Added to Annex III in 2023; both sources predate it                                 |
| 332   | Beta-Caryophyllene | Added to Annex III in 2023; both sources predate it                                 |

These three still require an independent check before submission (Section 6, item 8).

**Recall against real labels** — `apps/api/src/db/seed/corpus-coverage.ts` over 1,472
retail products, 1,299 with a usable ingredient list:

| Measure                        | Before 67-92 | After 67-92 |
| ------------------------------ | ------------ | ----------- |
| Match a seeded Annex III entry | 502          | **574**     |
| **Missed entirely**            | 73           | **1**       |

Adding the 19 entries in 67-92 closed the gap almost completely. Linalool (295 products)
and geraniol (153), previously the two largest blind spots, are now covered.

### 2e. Delisted substances are a compliance signal, not a recall gap

Three reference numbers inside 67-92 are struck out in the consolidated Annex III, and two
of them are struck out because the substance was **prohibited**, not because it became
safe:

| Entry | Substance                   | Status                                    |
| ----- | --------------------------- | ----------------------------------------- |
| 68    | Benzyl alcohol              | Labelling duty moved to entry 45          |
| 79    | HICC                        | Moved to Annex II entry 1380 — prohibited |
| 83    | Butylphenyl Methylpropional | Moved to Annex II entry 1666 — prohibited |

This is not academic. **57 corpus products still name a delisted substance** — 49 name
butylphenyl methylpropional and 9 name HICC. Scoring those as ordinary restricted
allergens would understate them, and omitting them would hide them. The coverage script
reports them separately.

Both are now seeded with `regulatoryStatus = prohibited` (Section 3.3), so all 57 of those
products resolve through precedence rule 1.

Butylphenyl methylpropional took longer to find than it should have. Annex II lists it as
`2-(4-tert-butylbenzyl) propionaldehyde` — its chemical name, not its INCI name — so
searching the annex for the label name returns nothing. CAS **80-54-6** is what ties the
two together, and it is the only reliable way to check whether a delisted INCI name has
reappeared in Annex II under another name. The ban is a CMR classification rather than a
fragrance-scoped one, so the status is `prohibited`, not `prohibited_as_fragrance`.

### 2f. Some substances hold two statuses at once

A CAS number can appear in both annexes because the annexes regulate different
preparations of the same source material. The regulation cross-references each pair:

| CAS       | Annex III        | Annex II   | Distinction                                       |
| --------- | ---------------- | ---------- | ------------------------------------------------- |
| 8007-00-9 | entry 154, 0,4 % | entry 1136 | Extracts restricted; crude Peru balsam prohibited |
| 8024-12-2 | entry 196, 0,2 % | entry 450  | Absolute restricted; essential oils prohibited    |

`dualStatusSubstances` records these, and the prohibited-set test allows exactly these two
while still failing on any undocumented overlap. The scoring engine must not collapse the
two annexes into one status.

---

## 3. Risk taxonomy

### 3.1 Categories

Five categories, fixed. Defined once in `packages/shared/src/scoring.ts` as
`RiskCategory` and mirrored in the `risk_category` Postgres enum in
`apps/api/src/db/schema.ts`. **Adding a category means editing both.**

Prohibition is deliberately **not** one of them — see Section 3.3.

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

Practically: if you cannot name a source for a tag, the tag does not get added. The three
preservative entries currently carry a placeholder citation and are flagged in Section 6
precisely because they do not yet meet this bar.

### 3.3 Regulatory status is not a risk category

Annex II status was considered as a sixth `RiskCategory` and rejected. The two answer
different questions:

|                   | Question it answers                           | Depends on the user? |
| ----------------- | --------------------------------------------- | -------------------- |
| `RiskCategory`    | Why is this substance risky **to me**?        | Yes                  |
| Regulatory status | May this product lawfully be sold **at all**? | No                   |

Collapsing them would have forced a meaningless `prohibited` row into
`skin_type_sensitivity` and let precedence rule 5 fire "prohibited is relevant to your
skin type", which is nonsense. It would also have violated Section 2f directly.

So `RegulatoryStatus` is a separate enum in `packages/shared/src/scoring.ts`, mirrored in
the `regulatory_status` Postgres enum and carried as a column on `ingredients` (not on
`ingredient_risk_tags` — status is a property of the substance, not of a reason it is
risky). **Adding a value means editing both.**

| Status                    | Meaning                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `none`                    | No numbered provision applies                                           |
| `restricted`              | Annex III — permitted subject to conditions                             |
| `prohibited`              | Annex II — banned outright; presence means the product is non-compliant |
| `prohibited_as_fragrance` | Annex II — banned only in the fragrance role                            |

`prohibited_as_fragrance` is the one that needs care. Entries 423–450 ban a substance
_"when used as a fragrance ingredient"_, and an ingredient list cannot establish the role
a substance was used in. Scoring those as outright bans would accuse compliant products of
being illegal, so they get their own status and their own, weaker rule.
`regulatoryStatusFor()` in `prohibited-substances.ts` is the single place that mapping
lives, and a test asserts a fragrance-role ban never resolves to `prohibited`.

The Annex II set is seeded separately by `seed-prohibited-substances.ts` and carries **no
risk tags at all**. If the seeder hits an existing ingredient with the same name it warns
and skips rather than overwriting — a name collision would mean relabelling an Annex III
entry as banned.

---

## 4. Matching and scoring

Matching and scoring are strictly separate. The scoring function consumes `MatchResult`
and nothing else, so it can be unit-tested without a database — which matters because
scoring is the highest-stakes logic in the project.

### 4.1 Matching

Input: raw ingredient strings (typed, pasted, or OCR-extracted).
Output: `MatchResult` — `matches[]` plus `unmatched[]`.

Each `IngredientMatch` carries `riskCategories`, `regulatoryStatus`, `sourceCitation`, and
`userDeclaredAllergyMatch`, the last being an exact hit against the user's own declared
allergy list.

`MatchResult` also carries two pieces of user context that are not properties of any one
ingredient: `skinType` and `sunExposure`. They sit on the result rather than being passed
as extra arguments, so `score()` consumes exactly one object and stays pure.

Matching must handle: case and punctuation variation, `parfum`/`fragrance` synonymy,
aliases (the `ingredients.aliases` array), and near-miss spellings from OCR. Anything
not confidently matched goes to `unmatched` — it is **never silently dropped**, because
an unrecognised ingredient is exactly the case a user needs told about.

Aliases matter more than they look. Annex III groups substances under one collective
labelling name — entry 366 covers ten `Rosa *` names that must all resolve to
`Rose Flower Oil/Extract`. The dataset stores those in `aliases`, and a test asserts no
alias collides with another entry's primary name.

### 4.2 Result tiers and precedence

Four tiers, severity ordered:

```
Avoid  >  Caution  >  UnverifiedCaution  >  Safe
```

Evaluated as a rule tree, highest matching rule wins. A rule tree was chosen over a
weighted numeric sum because it is explainable: every verdict traces to a specific
triggering ingredient, which the "explain the risk in plain language" objective requires.
A weighted sum would produce a number nobody could justify to a user.

| Precedence | Tier                | Trigger                                                                              |
| ---------- | ------------------- | ------------------------------------------------------------------------------------ |
| 1          | `Avoid`             | Any ingredient is `prohibited` under Annex II — the product is non-compliant         |
| 2          | `Avoid`             | Any ingredient matches the user's declared allergy list (`userDeclaredAllergyMatch`) |
| 3          | `Avoid`             | Any ingredient carries a regulation-backed tag conflicting with declared sensitivity |
| 4          | `Caution`           | Any ingredient is `prohibited_as_fragrance` and the label cannot establish the role  |
| 5          | `Caution`           | Any ingredient carries a risk tag relevant to the user's skin type                   |
| 6          | `Caution`           | Any ingredient is photosensitising and sun exposure is not ruled out                 |
| 7          | `UnverifiedCaution` | One or more ingredients are `unmatched` and no higher rule fired                     |
| 8          | `Safe`              | All ingredients matched, none triggered a rule                                       |

Rule 1 is the only rule that fires with **no user profile at all** — an Annex II ban is a
fact about the product, not about the person reading the label. Rule 4 is its deliberately
weaker sibling: the ban is real but conditional on a role the label does not state, so it
warns without asserting non-compliance. Both must name the Annex II entry in their
explanation, or the verdict is unusable.

Rule 6 turns on `sunExposure`, not on skin type, and that is the whole point of it.
Photosensitivity is caused by UV reaching treated skin; it is not a property of dry or
oily skin. `skin_type_sensitivity` therefore holds no photosensitising row, and adding one
to make the category fire would have described the hazard wrongly. A null `sunExposure`
means the user was never asked, which the rule treats as exposure being possible — the
same fail-safe reasoning as rule 7. Answering "sunlight is avoided" is the only thing that
silences it.

`UnverifiedCaution` exists so an unrecognised ingredient is never reported as `Safe`.
Absence of evidence is not evidence of safety, and conflating the two would be the most
damaging failure this system could make.

Every tier returns `explanations[]` naming the ingredient, a plain-language reason, and
the citation. A tier without an explanation is a bug.

### 4.3 Worked examples

To be turned directly into Vitest cases in Phase 5.

| #   | Profile              | Ingredients                       | Expected                       |
| --- | -------------------- | --------------------------------- | ------------------------------ |
| 1   | Allergic to Limonene | `Aqua, Glycerin, Limonene`        | `Avoid` — rule 2               |
| 2   | Sensitive skin       | `Aqua, Methylisothiazolinone`     | `Avoid` — rule 3               |
| 3   | Oily skin            | `Aqua, Coconut Oil`               | `Caution` — rule 5             |
| 4   | Empty profile        | `Aqua, Glycerin`                  | `Safe` — rule 8                |
| 5   | Empty profile        | `Aqua, Xyzzyne`                   | `UnverifiedCaution` — rule 7   |
| 6   | Allergic to Limonene | `Aqua, Limonene, Xyzzyne`         | `Avoid` — rule 2 beats 7       |
| 7   | Allergic to Rose     | `Aqua, Rosa Damascena Flower Oil` | `Avoid` — via entry 366 alias  |
| 8   | Empty profile        | `Aqua, Lyral`                     | `Avoid` — rule 1               |
| 9   | Empty profile        | `Aqua, Ficus Carica Leaf Extract` | `Caution` — rule 4, not rule 1 |
| 10  | Sun not asked        | `Aqua, Tagetes Minuta Flower Oil` | `Caution` — rule 6             |
| 11  | Sunlight avoided     | `Aqua, Tagetes Minuta Flower Oil` | rule 6 silent                  |

Case 6 is the tie-break that fixes the severity ordering: a declared-allergy hit must not
be masked by an unknown ingredient. Case 7 proves alias resolution, without which the
grouped Annex III entries silently under-match.

Cases 8 and 9 fix the Annex II split. Case 8 must return `Avoid` on an empty profile — a
ban does not need a user to be true. Case 9 must **not** escalate to `Avoid`: fig leaf
absolute is prohibited as a fragrance ingredient, the label does not say it was used as
one, and accusing a compliant product of illegality is its own kind of false positive.

---

## 5. Versioning

The dataset is versioned with the repo. Any change to a risk tag or to the rules in
Section 4.2 requires a Conventional Commit describing what changed and why, so the report
can reconstruct the decision history.

---

## 6. Open items

| #   | Item                                                                         | Blocks            | Owner   |
| --- | ---------------------------------------------------------------------------- | ----------------- | ------- |
| 1   | Add entries 67–92 from consolidated Annex III (Linalool, Geraniol, Eugenol…) | Scoring recall    | Wanjiku |
| 2   | Reconcile corrigendum `32023R1545R(02)` against the transcription            | Citation accuracy | Wanjiku |
| 3   | Decide CosIng ingestion route now that no bulk export was found              | Phase 4 matching  | Wanjiku |
| 4   | Replace placeholder citations on the 3 preservative entries                  | Defensibility     | Wanjiku |
| 5   | Build the three literature-curated lists with per-entry citations            | Phase 5           | Wanjiku |
| 6   | Re-verify the Open Beauty Facts row count in Section 2b                      | Report accuracy   | Wanjiku |
| 7   | Populate `skin_type_sensitivity` — currently no rows, so rule 5 cannot fire  | Phase 5           | Wanjiku |
| 8   | Add Butylphenyl Methylpropional to the Annex II set from the amending act    | Compliance recall | Wanjiku |
| 9   | Give `photosensitizing` a scoring path — it has data but no rule can fire it | Scoring recall    | Wanjiku |

**Item 7 is resolved.** `skin_type_sensitivity` holds 7 rows and rule 5 was verified
firing against the live database: `Linalool` on `dry` skin scores `Caution`, on `sensitive`
scores `Avoid` via rule 3, and on `normal` scores `Safe`. `skin_type` was also promoted
from `varchar(32)` to a Postgres enum, because a typo in that column inserted cleanly and
then silently never matched — rule 5 would have failed closed with no error anywhere.

All seven rows are now live: every risk category they reference has tagged ingredients
behind it (81 fragrance allergens, 3 preservative sensitizers, 14 comedogenic, 3
irritants). Rule 5 can fire for every skin type except `normal`, which has no rows by
design.

**Item 8 is resolved.** Annex II entry 1666, `2-(4-tert-butylbenzyl) propionaldehyde`,
CAS 80-54-6, EC 201-289-8, seeded as `prohibited`. It accounted for 49 of the 57
delisted-substance hits in the corpus, more than five times HICC's share. The entry is
cited to the consolidated text rather than to the amending act: entry 1666 sits under
amendment marker ▼M42, but the annex extract carries no legend mapping ▼M codes to
regulation numbers, and naming the instrument without that legend would be a guess.

**Item 5 is resolved.** All three literature-curated lists are seeded, and they did not
turn out to be equally weak — the evidence tiers differ sharply and the dataset records
which is which.

| Category           | Entries | Evidence                                             |
| ------------------ | ------- | ---------------------------------------------------- |
| `comedogenic`      | 14      | Rabbit-ear assay literature (PMID 18058303, 6229554) |
| `common_irritant`  | 3       | Named as irritants in review/clinical studies        |
| `photosensitizing` | 3       | **Annex III restriction text** — regulation-backed   |

`photosensitizing` was expected to be literature-only and is not. Three Annex III
entries — **308** (Tagetes minuta), **309** (Tagetes patula) and **323**
(Methyl-N-methylanthranilate) — carry the restriction "Not to be used in sunscreen
products and products marketed for exposure to natural/artificial UV light". That
sentence is the evidence; the hazard is stated by the regulator, not inferred by us.
Entries 308 and 309 also cap alpha-terthienyl at 0,35 %, the constituent the restriction
exists to control.

Two traps avoided while sourcing it. The Annex III **citrus oils** (entries 350-358,
bergamot, lemon and the rest) look like photosensitisers, and several genuinely are, but
their Annex III entries impose only the Article 19(1)(g) labelling threshold with no UV
restriction — so they stay `fragrance_allergen`, which is what the regulation actually
says about them. And **Annex II entry 358**, furocoumarins, is a prohibition rather than
a risk tag; "Furocoumarines" is a substance class no label would print, so it has no
place in a name-matched table.

`common_irritant` is the one category with no regulatory anchor at all: the word
"irritation" does not appear once in Annex III. The list is short deliberately — the
literature is full of studies that _use_ an ingredient to provoke irritation rather than
studies that establish the ingredient is an irritant, and only ingredients a source names
outright were taken.

The comedogenic evidence is the weakest tier and is fenced accordingly. Draelos & DiNardo
(PMID 16488305) tested finished products on human subjects and concluded that "finished
products using comedogenic ingredients are not necessarily comedogenic", so the category
stays out of `REGULATION_BACKED_CATEGORIES` and can never reach `Avoid`. It tops out at
`Caution` via rule 5. A regression test pins that.

One more source lesson: the SCCS Notes of Guidance (SCCS/1647/22) is a
testing-methodology manual, not an ingredient list — it explains how to run OECD TG 432
and carries two CAS numbers across 203 pages. Individual SCCS _substance_ opinions are
the right document type; the guidance is not.

**Item 9 is resolved.** `MatchResult` gained a `sunExposure` axis and the precedence tree
gained rule 6, so a photosensitiser now reaches `Caution` instead of scoring as if
untagged.

It was not a theoretical gap. A label reading `Aqua, Tagetes Minuta (Marigold) Flower
Oil, Glycerin` returned **Safe** on every skin type, against an ingredient the regulation
bars from sun-protection products. That is the most damaging shape of error this system
can make, and it was produced by correct data meeting an incomplete rule set.

The fix deliberately did not take the cheap route. Adding a `sensitive` x
`photosensitizing` row to `skin_type_sensitivity` would have made the category fire with
no contract change, and it would have been wrong: photosensitivity is caused by UV
reaching treated skin, not by having sensitive skin. The new axis says what is actually
true, and the three answers now behave as the regulation implies — `expected` and null
both warn, and only `avoided` is silent.

Null is treated as exposure being possible, matching rule 7's stance that absence of
evidence is not evidence of safety. Forgetting to ask the question cannot understate
risk.

**Item 3 is resolved.** See Section 2a — the published Glossary replaces the abandoned
CosIng bulk-export route.

**Item 6 is resolved.** Measured at 1,489 of 64,237, not the inherited ~1,552 — see
Section 2b. The denominator was exact; the numerator was 63 too high.

**Item 1 is closed.** Entries 67-92 are seeded; products missed entirely fell from 73
to 1. What remains is not a gap but a compliance question — see Section 2e.

**Correction — the NORMAN cosmetics set was initially rejected too broadly.** It was first
dismissed as an analytical-chemistry file with "no role in this system". That was wrong.
Its `Source` column shows it derives from Decision 2006/257/EC and the SCCNFP INCI 2000
inventory, making it a legitimate **identity** source. Adopting it raised CAS corroboration
from 45/62 to 59/62. The original judgement was right only in the narrow sense: it carries
no labelling or restriction data and is still never used for risk.

**Evidence that the Glossary `Restriction` column is unusable for Annex III status**
(measured, not asserted):

| Measure                                      | Value          |
| -------------------------------------------- | -------------- |
| Rows citing any Annex III entry              | 154 of 7,662   |
| Rows with a blank `Restriction`              | 7,168 of 7,662 |
| `Amyl Cinnamal` present but unrestricted     | yes            |
| `Benzyl Salicylate` present but unrestricted | yes            |

Both are Annex III fragrance allergens, both appear in the glossary, and both carry no
restriction. Using this column to derive entries 67–92 would therefore have produced
false negatives silently.
