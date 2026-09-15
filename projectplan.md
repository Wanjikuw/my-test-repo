# Cosmetic Ingredient Allergy Checker — Project Plan & Progress

**Owner:** Wanjiku Wakiama Kaimuri
**Window:** Aug 4 – Sep 30, 2026 · **Commitment:** 30+ hrs/week · **Scope:** web only
**Repo:** `my-test-repo` (`git@github.com:Wanjikuw/my-test-repo.git`)

This file is the live status of the build. Update it as each phase moves — it is the
evidence trail that the iterative methodology was actually followed, not just claimed.

---

## Status at a glance

| Phase                                   | Window          | Status              |
| --------------------------------------- | --------------- | ------------------- |
| 0 — Foundations & environment           | Aug 4 – Aug 6   | 🟡 Partial          |
| 1 — Data foundation & scoring rubric    | Aug 6 – Aug 17  | 🟡 Bar the synonyms |
| 2 — System design                       | Aug 18 – Aug 24 | ⬜ Not started      |
| 3 — Auth & skin profile                 | Aug 25 – Aug 31 | ⬜ Not started      |
| 4 — Ingredient input (manual + OCR)     | Sep 1 – Sep 7   | ⬜ Not started      |
| 5 — Analysis & scoring engine           | Sep 8 – Sep 14  | 🟡 Engine + API     |
| 6 — Recommendations, history, feedback  | Sep 15 – Sep 19 | ⬜ Not started      |
| 7 — Testing cycle 1 (QA + usability)    | Sep 20 – Sep 24 | ⬜ Not started      |
| 8 — Refinement                          | Sep 25 – Sep 27 | ⬜ Not started      |
| 9 — Testing cycle 2 + polish            | Sep 28 – Sep 29 | ⬜ Not started      |
| 10 — Docs, deploy hardening, submission | Sep 30          | ⬜ Not started      |

Legend: ✅ done · 🟡 in progress / partial · 🔴 blocked · ⬜ not started

---

## Outstanding — reviewed 15 Sep 2026

Written down so the next session starts from the truth rather than from this file's
previous claims, several of which had gone stale.

### Phase 1 — what stands between here and done

| #   | Item                                                                  | Evidence                                  |
| --- | --------------------------------------------------------------------- | ----------------------------------------- |
| 1.1 | 3 `preservative_sensitizer` tags cite `CITATION INCOMPLETE`           | ✅ closed 14 Sep — rubric §6 #4           |
| 1.2 | Corrigendum `32023R1545R(02)` never reconciled against the 81 entries | ✅ closed 14 Sep — rubric §6 #2           |
| 1.3 | `Safe` was unreachable: the corpus held no benign ingredient          | 🟡 reachable now — ceiling measured below |

**Closing 1.1 found a scoring error, not just a missing footnote.** Quaternium-15 was
carrying `regulatory_status = none`. It has been struck from Annex V and added to Annex II
entries 1385/1386, so a substance banned from cosmetics was being scored on its risk tag
alone. It is now `prohibited` and rule 1 fires. Methylisothiazolinone and DMDM Hydantoin
are now `restricted`, cited to Annex V entries 57 and 33.

**Closing 1.2 found three unmatchable names.** The corrigendum (OJ L series 2025/90876)
adds `Pelargonium Graveolens Oil`, `Pelargonium Graveolens Leaf Oil` and
`Pogostemon Cablin Leaf Oil` as Common Ingredients Glossary names, and corrects Rose
ketone 4 to `Damascenone`. All four were missing; a label printing any of them went
unrecognised. All are now seeded and verified resolving against the live database.

**And the seeder could not have delivered either fix.** Both of its writes used
`onConflictDoNothing`, so a re-run after a correction changed nothing — the dataset was
versioned in the repo but unreachable from it. Both are now upserts; the re-run rewrote
all 104 rows.

### 1.3 — `Safe` now reaches, and the ceiling is measured

7,589 identity-only rows were seeded from the EU Glossary (Decision 96/335/EC). They carry
no risk tag and `regulatory_status = none`, which is the point: a recognised-but-
unremarkable ingredient is a different fact from an unrecognised one, and the dataset had
no way to say so. Measured over 1,299 real labels carrying 45,454 printed names:

|                                      | Before | After      |
| ------------------------------------ | ------ | ---------- |
| label names the corpus can read      | 4.8 %  | **69.3 %** |
| median unknown names per label       | 31     | **10**     |
| distinct unknown names               | 5,390  | 3,774      |
| cited entries shadowed by the import | —      | **0**      |

And it works end to end, which it never had before:

```
Aqua, Glycerin, Tocopherol, Xanthan Gum   ->  Safe
Aqua, Glycerin, Quaternium-15            ->  Avoid
```

**The ceiling.** `Safe` needs every name on a label to resolve, so a 35-ingredient label
needs near-total identity coverage and only 1 of 1,299 labels currently clears it. Closing
the rest needs 3,791 more names, and **the Glossary is exhausted — exactly one unresolved
name is still in it.** The remainder have no citable identity source in this project, and
inventing them would cost the per-entry citation the whole methodology rests on. That is a
quantified limit of a citation-first approach, not a to-do.

**The synonym set is done, and the Glossary supplied it.** The plan was to hand-write a
`water → Aqua` alias and find a citation for it. That turned out to be unnecessary: row
L421 of the Glossary reads `AQUA | INN name: water | Ph. Eur. Name: aqua`, so the seeder
now reads those two columns as aliases and asserts nothing of its own. **340 synonyms**
came from the source across **302 rows**, and `water` — on 1,011 of 1,299 labels — is one
of them. Token coverage moved 67.0 % → 69.3 %, which is almost exactly the weight of
`water` alone, and a US-style label now resolves cleanly:

```
Water, Glycerin, Tocopherol, Xanthan Gum  ->  Safe, 4 matched, 0 unmatched
```

**`fragrance` is not derivable and was not invented.** The Glossary's `PARFUM` row carries
no INN name at all — its description is only "Perfume and aromatic compositions and their
raw materials". `Fragrance` is the US INCI term and no source here states the equivalence,
so 357 labels keep it as an unknown until a source for it exists.

### Evidence-trail hygiene

| Item                                                              | State                     |
| ----------------------------------------------------------------- | ------------------------- |
| Commit log below reconciled to `HEAD`                             | ✅ 15 Sep — 21 rows added |
| `main` is 10 commits ahead of `origin/main`                       | 🔴 **all of it unpushed** |
| Phase 0 deploy targets (Fly, Vercel, Upstash) still unprovisioned | unchanged since 6 Aug     |

`annexV.MD` was committed by mistake on 14 Sep and untracked again on 15 Sep. `.gitignore`
keeps regulation reference copies out of the repo — they are large, redistributable only
under EUR-Lex terms, and not build inputs, because the citable facts live in the seed
files. The file stays in history on the unpushed commits; rewriting them to drop it is
still available and is the only moment it will be cheap.

---

## Next steps

Ordered by what fails worst if it is skipped. **15 days remain and there is still no
user-facing product** — the API is in good shape and nothing can reach it.

### 1. Push. Today.

Ten commits of the strongest work in the project exist on one machine. Everything else on
this list is worth less than not losing it. Decide first whether to rewrite history to drop
`annexV.MD`, because after the push that choice is gone.

### 2. Finish Phase 1 with the synonym set — half a day

`water` fails on 1,011 of 1,299 labels and `fragrance` on 357, and the corpus already holds
`Aqua` and `Parfum`. Add a small, cited INCI ↔ common-name synonym set to `aliases` per
rubric Section 4.1. This is the highest coverage-per-hour left anywhere in the data, and it
closes Phase 1 properly rather than declaring it closed.

### 3. Deploy the API to Fly — half a day

Phase 0 has carried this as ⬜ since 6 August. The web app cannot be built against nothing,
and `fly.toml`, the `Dockerfile` and `TRUST_PROXY` are already in place, so this is
configuration rather than construction.

### 4. Build the web app — the bulk of the remaining time

This is Phases 3, 4 and 5's interface and it is the critical path. In dependency order:

- **Skin profile** — skin type and declared allergies. Hold it in `zustand` local state
  first; `@supabase/ssr` is installed but auth is Phase 3 scope that the analysis flow does
  not need. Add auth only if the schedule allows.
- **Ingredient input** — paste a label into `POST /analyze`, with `GET /ingredients` behind
  an autocomplete for manual entry. OCR is the stretch goal, not the path.
- **Results view** — tier, the explanations, and the citation behind each one. It must show
  what was _not_ recognised as prominently as what was: the median label still carries 10
  unknown names, and a verdict that hides that is the failure mode this project has spent
  the most effort avoiding.

### 5. Deploy the web app to Vercel, then testing cycles

Phases 7 to 10. Whatever time is left.

### Deliberately not doing

Upstash Redis and `bullmq` are dependencies with no consumer; there is no background work
to queue. Sentry is wired and inert without a DSN, which is correct. `product_ingredients`
stays empty — linking product text to ingredients needs identity coverage the corpus does
not have, and the measurement in 1.3 says why.

---

## Commit log

| Commit    | Message                                                                          | Phase |
| --------- | -------------------------------------------------------------------------------- | ----- |
| `a156452` | `chore: scaffold pnpm/turborepo monorepo with web, api and shared packages`      | 0     |
| `7a9252c` | `docs: add phase 1 data sourcing and scoring rubric`                             | 1     |
| `a7ce954` | `feat(data): seed 62 EU Annex III fragrance allergens from Regulation 2023/1545` | 1     |
| `485cece` | `docs: record sourced annex III dataset in rubric and add project plan`          | 1     |
| `6afeb10` | `feat(data): validate annex III dataset against EU glossary and measure recall`  | 1     |
| `093e83b` | `feat(data): corroborate annex III dataset against a second identity source`     | 1     |
| `4a481e5` | `feat(data): seed annex III entries 67-92 and record two delisted substances`    | 1     |
| `ba625e1` | `docs: record closed recall gap and dual-status substances`                      | 1     |
| `65e770c` | `ci: resolve pnpm version conflict and pin node to .nvmrc`                       | 0     |
| `4f6d1ad` | `docs: mark remote CI green in project plan`                                     | 0     |
| `18211f9` | `feat(scoring): model Annex II prohibition as a regulatory status`               | 1     |
| `f1fae36` | `feat(db): add initial migration and re-verify the product corpus count`         | 1     |
| `82aac71` | `docs: record the seeded database state`                                         | 1     |
| `38f1824` | `feat(scoring): implement the precedence tree and make rule 5 fire`              | 1     |
| `ec91978` | `fix(scoring): stop rule 3 and rule 5 double-explaining one ingredient`          | 1     |
| `65b8b5c` | `chore: keep regulation reference copies out of version control`                 | 0     |
| `d83dae7` | `feat(data): complete the curated risk datasets and close the Annex II gap`      | 1     |
| `971f563` | `feat(matching): resolve printed ingredient labels to seeded ingredients`        | 5     |
| `e2c18d1` | `feat(matching): add spelling, common-name and fuzzy-suggestion strategies`      | 5     |
| `2f956e4` | `fix(scoring): give photosensitising ingredients a rule that can fire`           | 1     |
| `93aaf01` | `fix(api): fail closed on CORS and stop errors leaking internals`                | 0     |
| `f2218d2` | `perf(matching): cache the ingredient index and bound fuzzy search`              | 5     |
| `0325b20` | `perf(db): batch the curated seeder into three statements`                       | 1     |
| `a33b86f` | `chore(deploy): pin the runtime and widen the health-check grace period`         | 0     |
| `5bc92b7` | `feat(api): rate limiting, error reporting, and a pool sized for this workload`  | 0     |
| `70a8d1f` | `fix(matching): split a comma with a digit on only one side`                     | 5     |
| `2a9427a` | `feat(api): serve analysis and ingredient lookup over HTTP`                      | 5     |
| `9f56a49` | `docs: reconcile the project plan with the measured database state`              | —     |
| `28ee8c4` | `fix(db): let the curated seeder carry a correction, not only an insert`         | 1     |
| `87f1d59` | `fix(data): cite the preservatives to Annex V and apply corrigendum R(02)`       | 1     |
| `f9dca93` | `docs: record rubric open items 2 and 4 as closed`                               | 1     |
| `088cb9a` | `perf(api): sort the corpus once per load instead of once per request`           | 5     |
| `40a1fa4` | `feat(data): seed a cited identity baseline so a clean product can read as Safe` | 1     |
| `87a2f13` | `docs: record the identity baseline and the ceiling it does not clear`           | 1     |

Conventional Commits enforced from commit #1 (history squashed to guarantee this).
A commit cannot cite its own hash, so this table always lags HEAD by one entry.

---

## Phase 0 — Foundations & environment 🟡

**Deliverable:** empty-but-running web app and API, both deployed, CI green.

| Task                                                               | Status                                |
| ------------------------------------------------------------------ | ------------------------------------- |
| pnpm/Turborepo monorepo: `apps/web`, `apps/api`, `packages/shared` | ✅                                    |
| Husky + lint-staged + Prettier + ESLint flat config                | ✅ verified on a real commit          |
| `pnpm-lock.yaml` committed                                         | ✅                                    |
| Local CI gauntlet green (format/lint/typecheck/test/build)         | ✅                                    |
| GitHub Actions workflow present                                    | ✅ green on remote (run 33779752322)  |
| Supabase project provisioned                                       | ✅ `bjzzivckgjglkxlywbut` (eu-west-2) |
| Fly.io project + API deployed                                      | ⬜                                    |
| Vercel project + web deployed                                      | ⬜                                    |
| Upstash Redis provisioned                                          | ⬜                                    |
| Sentry DSN wired into API and web                                  | ⬜ (no `@sentry/*` dependency yet)    |
| First push to GitHub / CI green on remote                          | ✅ `65e770c`                          |

**Toolchain as actually configured:** Node 20.20.2 (nvm), pnpm 9.12.0 (corepack),
developed inside WSL Ubuntu — not over the `\\wsl.localhost` share.

**Defects found and fixed while standing this up:**

| Issue                               | Cause                                                                                  | Fix                                                                          |
| ----------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Husky hook failed (code 127)        | Hooks run via `sh -e` with a reduced `PATH`; `pnpm` resolved to a Windows binary       | POSIX-safe `PATH` prepend reading `.nvmrc`                                   |
| Husky hook failed (code 3)          | First fix sourced `nvm.sh`, which is bash-only and dies under dash                     | Removed the `source` entirely                                                |
| Fix silently no-op'd                | `.nvmrc` was CRLF, so the path became `v20.20.2\r/bin`                                 | Stripped CR from 6 files; added `.gitattributes`                             |
| `tsconfig.tsbuildinfo` staged       | No `*.tsbuildinfo` ignore rule                                                         | Added to `.gitignore`                                                        |
| CI failed `ERR_PNPM_BAD_PM_VERSION` | pnpm pinned twice: `version: 9` in the workflow and `pnpm@9.12.0` in `packageManager`  | Dropped the workflow pin; `packageManager` is now the single source of truth |
| CI ran a different Node than local  | Workflow hardcoded `node-version: 20` while `.nvmrc` says `20.20.2`                    | Switched to `node-version-file: '.nvmrc'`                                    |
| `db:migrate` failed `ENETUNREACH`   | `db.<ref>.supabase.co` publishes only an AAAA record and WSL has no IPv6 default route | Switched `DATABASE_URL` to the IPv4 session pooler on `aws-0-eu-west-2:5432` |
| Connection string mis-parsed        | The generated DB password contains a literal `@`, giving the URI authority two `@`     | Percent-encoded the password and appended `sslmode=require`                  |

> ⚠ **Phase 0 is not closeable** until the remaining provisioning rows are done. Supabase
> is live and migrated, but Fly.io, Vercel, Upstash and Sentry are still unprovisioned.

---

## Phase 1 — Data foundation & scoring rubric 🟡 (CRITICAL PATH)

**Deliverable:** versioned, seeded `ingredients` dataset + written scoring rubric.

| Task                                                          | Status                                       |
| ------------------------------------------------------------- | -------------------------------------------- |
| Scoring rubric written as a spec before engine code           | ✅ `docs/Phase1_…Rubric.md`                  |
| Risk taxonomy fixed (5 categories, mirrored in DB enum)       | ✅                                           |
| Tier model + precedence decided (rule tree, not weighted sum) | ✅ rubric §4.2                               |
| Worked examples written for Phase 5 tests                     | ✅ rubric §4.3 (9 cases)                     |
| EU Annex III fragrance allergens transcribed                  | ✅ **81 entries**, cited per entry           |
| Annex II prohibition modelled as `regulatory_status`          | ✅ rubric §3.3 — not a 6th risk category     |
| Dataset invariants under test                                 | ✅ 29 tests, all passing                     |
| Seeder refuses to revive repealed Annex III entries           | ✅                                           |
| Annex III entries 67–92 (Linalool, Geraniol, Eugenol, …)      | ✅ 19 seeded; 68/79/83 struck out            |
| Butylphenyl Methylpropional in the Annex II set               | ✅ entry 1666, seeded `prohibited`           |
| Preservative sensitizers with defensible citations            | ✅ Annex V entries 57 and 33; Annex II 1386  |
| `common_irritant` / `comedogenic` / `photosensitizing` lists  | ✅ 3 / 14 / 3 seeded, cited per entry        |
| `skin_type_sensitivity` seed data                             | ✅ 7 rows — rule 5 verified firing           |
| CosIng ingestion route                                        | ✅ EU Glossary replaces it — rubric §6 #3    |
| Open Beauty Facts import re-verified                          | ✅ measured 1,489/64,237 (was ~1,552)        |
| Corrigendum `32023R1545R(02)` reconciled                      | ✅ 3 corrections applied — rubric §6 #2      |
| A benign ingredient can be recognised                         | 🔴 corpus is risk-only, `Safe` unreachable   |
| Dataset seeded into Supabase                                  | ✅ 140 ingredients, 104 tags, 1,489 products |

### Seeded database state

Seeded into Supabase `bjzzivckgjglkxlywbut` on 2026-09-13, after RLS was enabled and its
five read policies were applied — so no row has ever existed in an unprotected table.
Counts below re-measured against the live database on 2026-09-14.

| Table                   | Rows      | Note                                                             |
| ----------------------- | --------- | ---------------------------------------------------------------- |
| `ingredients`           | **7,729** | 140 cited risk/prohibition rows + 7,589 Glossary identities      |
| `ingredient_risk_tags`  | **104**   | 81 fragrance, 14 comedogenic, 3 each irritant/photo/preservative |
| `products`              | **1,489** | Open Beauty Facts, skincare filter                               |
| `product_ingredients`   | 0         | By design — linking product text to ingredients is Phase 4/5     |
| `skin_type_sensitivity` | **7**     | All 7 can fire; every category they name has tagged rows         |

`regulatory_status` distribution, which is the first end-to-end proof of the Section 3.3
model against a real database:

| Status                    | Count |
| ------------------------- | ----- |
| `none`                    | 7,606 |
| `restricted`              | 86    |
| `prohibited_as_fragrance` | 32    |
| `prohibited`              | 5     |

Two invariants were asserted post-seed: **36 ingredients carry no risk tag** and **0 risk
tags have an empty citation**. Both needed restating on 14 Sep. The untagged set is no
longer the Annex II list at all — 7,589 Glossary identities are untagged by design, and
Quaternium-15 is an Annex II substance that is also a documented sensitiser, so it is both
`prohibited` and tagged. The invariant that holds and is now tested is narrower: **no
Glossary-sourced row carries a risk tag**, because the Glossary is an identity source and
never a risk one. The citation invariant was also weaker than it read — three citations
were present but said `CITATION INCOMPLETE`. A test now rejects any citation that admits it
is missing.

### Dataset provenance

Sources: Commission Regulation (EU) 2023/1545 (OJ L 188, 27.7.2023, p. 1;
CELEX:32023R1545) for entries 45/46/70/73/86/88/109/114/122/124/131/133/154/157/175/196/324
and 327-371; the consolidated Annex III (CELEX:02009R1223) for the 19 pre-existing entries
in 67-92.

| Set                   | Count  | Annex III entries                                                             |
| --------------------- | ------ | ----------------------------------------------------------------------------- |
| Substituted           | 17     | 45, 46, 70, 73, 86, 88, 109, 114, 122, 124, 131, 133, 154, 157, 175, 196, 324 |
| Added                 | 45     | 327–371                                                                       |
| **Seeded**            | **81** |                                                                               |
| Repealed — never seed | 10     | 125, 126, 158, 160–163, 165, 167, 168                                         |

Cross-checked against the act's CELLAR metadata notice, which independently lists the same
substituted / added / deleted entry numbers.

### External validation of the transcription

The 62 entries were corroborated by CAS number against two independent EU identity sources
via `apps/api/src/db/seed/validate-identity.ts`:

| Source                                                | Rows  | Confirmed by CAS |
| ----------------------------------------------------- | ----- | ---------------- |
| EU Glossary of Common Ingredient Names (96/335/EC)    | 7,662 | 45 / 62          |
| NORMAN cosmetics set (2006/257/EC + SCCNFP INCI 2000) | 3,333 | 32 / 62          |
| **Union**                                             |       | **59 / 62**      |

**Zero conflicting matches** — no entry resolved to a different substance, which is the
error a hand transcription actually produces. Three entries remain uncorroborated and are
explicable: Pinus Mugo (botanical extract, not a discrete structure) and Acetyl Cedrene /
Beta-Caryophyllene (added to Annex III in 2023; both sources predate that).

Neither source is authoritative for restriction status. The Glossary `Restriction` column
is blank on 7,168 of 7,662 rows and cites only 154 Annex III entries; Amyl Cinnamal and
Benzyl Salicylate appear with no restriction despite being Annex III allergens. It cannot
supply entries 67–92.

### Measured recall against a real product corpus

`apps/api/src/db/seed/corpus-coverage.ts` over 1,472 retail products (1,299 usable):

| Measure                        | Before 67-92 | After 67-92 |
| ------------------------------ | ------------ | ----------- |
| Match a seeded Annex III entry | 502          | **574**     |
| **Missed entirely**            | 73           | **1**       |

Linalool (295 products) and geraniol (153) were the two largest blind spots and are now
covered.

Separately, **57 products still name a substance that has been delisted from Annex III** —
49 butylphenyl methylpropional (entry 83, struck out) and 9 HICC (entry 79, moved to
Annex II and prohibited). These are reported as a compliance signal rather than counted as
a recall gap.

### Data source decisions

`Merged_CosmeticProducts_04052017.csv` (NORMAN) was **initially rejected and that call was
reversed.** It is a mass-spectrometry reference set, so it carries no labelling or
restriction data and is never used for risk — but its `Source` column shows it derives from
Decision 2006/257/EC and the SCCNFP INCI 2000 inventory, making it a valid identity source.
Adopting it lifted CAS corroboration from 45/62 to 59/62.
