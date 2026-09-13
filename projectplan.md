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
| `485cece` | `docs: record sourced annex III dataset in rubric and add project plan`          | 1     |
| `6afeb10` | `feat(data): validate annex III dataset against EU glossary and measure recall`  | 1     |
| `093e83b` | `feat(data): corroborate annex III dataset against a second identity source`     | 1     |
| `4a481e5` | `feat(data): seed annex III entries 67-92 and record two delisted substances`    | 1     |
| `ba625e1` | `docs: record closed recall gap and dual-status substances`                      | 1     |
| `65e770c` | `ci: resolve pnpm version conflict and pin node to .nvmrc`                       | 0     |
| `4f6d1ad` | `docs: mark remote CI green in project plan`                                     | 0     |
| `18211f9` | `feat(scoring): model Annex II prohibition as a regulatory status`               | 1     |

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

| Task                                                          | Status                                   |
| ------------------------------------------------------------- | ---------------------------------------- |
| Scoring rubric written as a spec before engine code           | ✅ `docs/Phase1_…Rubric.md`              |
| Risk taxonomy fixed (5 categories, mirrored in DB enum)       | ✅                                       |
| Tier model + precedence decided (rule tree, not weighted sum) | ✅ rubric §4.2                           |
| Worked examples written for Phase 5 tests                     | ✅ rubric §4.3 (9 cases)                 |
| EU Annex III fragrance allergens transcribed                  | ✅ **81 entries**, cited per entry       |
| Annex II prohibition modelled as `regulatory_status`          | ✅ rubric §3.3 — not a 6th risk category |
| Dataset invariants under test                                 | ✅ 29 tests, all passing                 |
| Seeder refuses to revive repealed Annex III entries           | ✅                                       |
| Annex III entries 67–92 (Linalool, Geraniol, Eugenol, …)      | ✅ 19 seeded; 68/79/83 struck out        |
| Butylphenyl Methylpropional in the Annex II set               | 🔴 49 of 57 delisted hits — rubric §6 #8 |
| Preservative sensitizers with defensible citations            | 🔴 placeholder citations only            |
| `common_irritant` / `comedogenic` / `photosensitizing` lists  | ⬜ not started                           |
| `skin_type_sensitivity` seed data                             | ⬜ **empty — rule 5 unreachable**        |
| CosIng ingestion route                                        | ⬜ no bulk export found                  |
| Open Beauty Facts import re-verified                          | ✅ measured 1,489/64,237 (was ~1,552)    |

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
