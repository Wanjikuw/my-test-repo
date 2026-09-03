# Cosmetic Ingredient Allergy Checker — Project Plan & Progress

**Owner:** Wanjiku Wakiama Kaimuri
**Window:** Aug 4 – Sep 30, 2026 · **Commitment:** 30+ hrs/week · **Scope:** web only
**Repo:** `my-test-repo` (`git@github.com:Wanjikuw/my-test-repo.git`)

This file is the live status of the build. Update it as each phase moves — it is the
evidence trail that the iterative methodology was actually followed, not just claimed.

---

## Status at a glance

| Phase                                   | Window          | Status         |
| --------------------------------------- | --------------- | -------------- |
| 0 — Foundations & environment           | Aug 4 – Aug 6   | 🟡 Partial     |
| 1 — Data foundation & scoring rubric    | Aug 6 – Aug 17  | 🟡 In progress |
| 2 — System design                       | Aug 18 – Aug 24 | ⬜ Not started |
| 3 — Auth & skin profile                 | Aug 25 – Aug 31 | ⬜ Not started |
| 4 — Ingredient input (manual + OCR)     | Sep 1 – Sep 7   | ⬜ Not started |
| 5 — Analysis & scoring engine           | Sep 8 – Sep 14  | ⬜ Not started |
| 6 — Recommendations, history, feedback  | Sep 15 – Sep 19 | ⬜ Not started |
| 7 — Testing cycle 1 (QA + usability)    | Sep 20 – Sep 24 | ⬜ Not started |
| 8 — Refinement                          | Sep 25 – Sep 27 | ⬜ Not started |
| 9 — Testing cycle 2 + polish            | Sep 28 – Sep 29 | ⬜ Not started |
| 10 — Docs, deploy hardening, submission | Sep 30          | ⬜ Not started |

Legend: ✅ done · 🟡 in progress / partial · 🔴 blocked · ⬜ not started

---

## Commit log

| Commit    | Message                                                                          | Phase |
| --------- | -------------------------------------------------------------------------------- | ----- |
| `a156452` | `chore: scaffold pnpm/turborepo monorepo with web, api and shared packages`      | 0     |
| `7a9252c` | `docs: add phase 1 data sourcing and scoring rubric`                             | 1     |
| `a7ce954` | `feat(data): seed 62 EU Annex III fragrance allergens from Regulation 2023/1545` | 1     |

Conventional Commits enforced from commit #1 (history squashed to guarantee this).

---

## Phase 0 — Foundations & environment 🟡

**Deliverable:** empty-but-running web app and API, both deployed, CI green.

| Task                                                               | Status                                  |
| ------------------------------------------------------------------ | --------------------------------------- |
| pnpm/Turborepo monorepo: `apps/web`, `apps/api`, `packages/shared` | ✅                                      |
| Husky + lint-staged + Prettier + ESLint flat config                | ✅ verified on a real commit            |
| `pnpm-lock.yaml` committed                                         | ✅                                      |
| Local CI gauntlet green (format/lint/typecheck/test/build)         | ✅                                      |
| GitHub Actions workflow present                                    | ✅ (not yet exercised — nothing pushed) |
| Supabase project provisioned                                       | ⬜                                      |
| Fly.io project + API deployed                                      | ⬜                                      |
| Vercel project + web deployed                                      | ⬜                                      |
| Upstash Redis provisioned                                          | ⬜                                      |
| Sentry DSN wired into API and web                                  | ⬜ (no `@sentry/*` dependency yet)      |
| First push to GitHub / CI green on remote                          | ⬜                                      |

**Toolchain as actually configured:** Node 20.20.2 (nvm), pnpm 9.12.0 (corepack),
developed inside WSL Ubuntu — not over the `\\wsl.localhost` share.

**Defects found and fixed while standing this up:**

| Issue                         | Cause                                                                            | Fix                                              |
| ----------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------ |
| Husky hook failed (code 127)  | Hooks run via `sh -e` with a reduced `PATH`; `pnpm` resolved to a Windows binary | POSIX-safe `PATH` prepend reading `.nvmrc`       |
| Husky hook failed (code 3)    | First fix sourced `nvm.sh`, which is bash-only and dies under dash               | Removed the `source` entirely                    |
| Fix silently no-op'd          | `.nvmrc` was CRLF, so the path became `v20.20.2\r/bin`                           | Stripped CR from 6 files; added `.gitattributes` |
| `tsconfig.tsbuildinfo` staged | No `*.tsbuildinfo` ignore rule                                                   | Added to `.gitignore`                            |

> ⚠ **Phase 0 is not closeable** until the four provisioning rows and the first green
> remote CI run are done. Everything below is being built against a local-only stack.

---

## Phase 1 — Data foundation & scoring rubric 🟡 (CRITICAL PATH)

**Deliverable:** versioned, seeded `ingredients` dataset + written scoring rubric.

| Task                                                          | Status                                    |
| ------------------------------------------------------------- | ----------------------------------------- |
| Scoring rubric written as a spec before engine code           | ✅ `docs/Phase1_…Rubric.md`               |
| Risk taxonomy fixed (5 categories, mirrored in DB enum)       | ✅                                        |
| Tier model + precedence decided (rule tree, not weighted sum) | ✅ rubric §4.2                            |
| Worked examples written for Phase 5 tests                     | ✅ rubric §4.3 (7 cases)                  |
| EU Annex III fragrance allergens transcribed                  | ✅ **62 entries**, cited per entry        |
| Dataset invariants under test                                 | ✅ 8 tests in `curated-risk-data.test.ts` |
| Seeder refuses to revive repealed Annex III entries           | ✅                                        |
| Annex III entries 67–92 (Linalool, Geraniol, Eugenol, …)      | 🔴 **missing** — see below                |
| Preservative sensitizers with defensible citations            | 🔴 placeholder citations only             |
| `common_irritant` / `comedogenic` / `photosensitizing` lists  | ⬜ not started                            |
| `skin_type_sensitivity` seed data                             | ⬜ **empty — rule 3 unreachable**         |
| CosIng ingestion route                                        | ⬜ no bulk export found                   |
| Open Beauty Facts import re-verified                          | ⬜ 1,552/64,237 figure unverified         |

### Dataset provenance

Source: Commission Regulation (EU) 2023/1545 (OJ L 188, 27.7.2023, p. 1; CELEX:32023R1545).

| Set                   | Count  | Annex III entries                                                             |
| --------------------- | ------ | ----------------------------------------------------------------------------- |
| Substituted           | 17     | 45, 46, 70, 73, 86, 88, 109, 114, 122, 124, 131, 133, 154, 157, 175, 196, 324 |
| Added                 | 45     | 327–371                                                                       |
| **Seeded**            | **62** |                                                                               |
| Repealed — never seed | 10     | 125, 126, 158, 160–163, 165, 167, 168                                         |

Cross-checked against the act's CELLAR metadata notice, which independently lists the same
substituted / added / deleted entry numbers.

### Known limitations to declare in the report

1. **Entries 67–92 are absent.** An amending act only reproduces what it changes, so
   Linalool, Geraniol, Eugenol, Coumarin and Cinnamal are not in the source text used.
   The engine cannot flag them today — a known false-negative class.
2. **Corrigendum `32023R1545R(02)` (2025-11-07) unreconciled**, language scope unstated.
3. **Labelling is still phasing in** to 2026-07-31 / 2028-07-31, so a product on sale may
   lawfully omit these declarations. Absence of a declared allergen ≠ absence.

---

## Phase 2 — System design ⬜

ER diagram · Zod schemas in `packages/shared` for every entity · wireframes ·
three-tier architecture diagram · OpenAPI contract. All committed under `/docs`.

Note: `skin_profiles`, `scan_history`, `recommendations` and `feedback` tables do **not**
exist yet — only `ingredients`, `ingredient_risk_tags`, `skin_type_sensitivity`,
`products`, `product_ingredients`.

---

## Phase 3 — Auth & skin profile ⬜

Supabase Auth · skin profile CRUD · RLS on `users` and `skin_profiles` · Vitest on
profile validation.

> ⚠ **Carried-over risk:** `apps/api` connects as the table owner via `DATABASE_URL`,
> which **bypasses RLS entirely**. Existing policies only protect direct browser→Supabase
> access. Before the API serves any user data it must verify the Supabase JWT and assume
> the `authenticated` role per request, or the RLS design is decorative.

---

## Phase 4 — Ingredient input ⬜

Manual paste/type with fuzzy matching · OCR via BullMQ → parsed candidates → user
confirmation · low-confidence fallback pre-fills the manual form.

Reference notebook (PyTesseract / EasyOCR / PaddleOCR) is Python and its extraction
heuristic terminates the list at the first lowercase character — do **not** port that
logic; real INCI lists are full of lowercase.

---

## Phase 5 — Analysis & scoring engine ⬜

Implement rubric §4.2 · plain-language explanations · heavy unit coverage on edge cases.
Start from the 7 worked examples in rubric §4.3.

---

## Phase 6 — Recommendations, history & feedback ⬜

Results screen with ingredient-level breakdown · history · reaction feedback.

---

## Phase 7 — Testing cycle 1 ⬜

Coverage audit on scoring + matcher · Playwright E2E · 4–6 usability participants ·
security pass proving RLS with a second account. Written report is Chapter 4/5 content.

---

## Phase 8 — Refinement ⬜ · Phase 9 — Testing cycle 2 ⬜ · Phase 10 — Ship ⬜

Sep 30 is **ship day, not build day**. If final assembly happens that day, something
upstream slipped.

---

## Risk register

| Risk                                | Status                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------ |
| No ready-made allergy dataset       | 🟡 Mitigated — own tagged layer built, 62 entries cited; gaps documented |
| RLS bypassed by owner-role API      | 🔴 Open — must fix before Phase 3 serves user data                       |
| OCR accuracy unreliable             | ⬜ Manual fallback mandatory by design; OCR polish capped                |
| Rubric invented ad-hoc while coding | ✅ Avoided — rubric written and committed before engine work             |
| Testing bolted on at the end        | 🟡 On track — 9 tests exist; dataset invariants under CI                 |
| Docs reconstructed from memory late | 🟡 On track — rubric + this plan written as work happened                |
| Deployment left until late          | 🔴 Open — nothing deployed, nothing pushed, remote CI never run          |
