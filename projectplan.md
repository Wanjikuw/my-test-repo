# Cosmetic Ingredient Allergy Checker — Project Plan & Progress

**Owner:** Wanjiku Wakiama Kaimuri
**Window:** Aug 4 – Sep 30, 2026 · **Commitment:** 30+ hrs/week · **Scope:** web only
**Repo:** `my-test-repo` (`git@github.com:Wanjikuw/my-test-repo.git`)

This file is the live status of the build. Update it as each phase moves — it is the
evidence trail that the iterative methodology was actually followed, not just claimed.

---

## Status at a glance

Re-measured 26 Sep 2026. Percentages are judged against each phase's deliverable, and the
overall figure weights each phase by the days the plan gave it.

| Phase                                   | Window          | Status                          | Done     |
| --------------------------------------- | --------------- | ------------------------------- | -------- |
| 0 — Foundations & environment           | Aug 4 – Aug 6   | 🟡 Nothing deployed yet         | 70 %     |
| 1 — Data foundation & scoring rubric    | Aug 6 – Aug 17  | ✅ Ceiling measured, not a gap  | 95 %     |
| 2 — System design                       | Aug 18 – Aug 24 | 🟡 Built, not written up        | 60 %     |
| 3 — Auth & skin profile                 | Aug 25 – Aug 31 | 🟡 Profile local; auth descoped | 60 %     |
| 4 — Ingredient input (manual + OCR)     | Sep 1 – Sep 7   | 🟡 Untested on real phones      | 90 %     |
| 5 — Analysis & scoring engine           | Sep 8 – Sep 14  | ✅ Engine, API and results UI   | 95 %     |
| 6 — Recommendations, history, feedback  | Sep 15 – Sep 19 | 🟡 Model notes only             | 10 %     |
| 7 — Testing cycle 1 (QA + usability)    | Sep 20 – Sep 24 | 🟡 Unit tests only              | 30 %     |
| 8 — Refinement                          | Sep 25 – Sep 27 | 🟡 26 Sep pass below            | 40 %     |
| 9 — Testing cycle 2 + polish            | Sep 28 – Sep 29 | ⬜ Not started                  | 0 %      |
| 10 — Docs, deploy hardening, submission | Sep 30          | 🟡 Deploy config only           | 20 %     |
|                                         |                 | **Overall, day-weighted**       | **65 %** |

The core path — data, input, engine, results (phases 1, 4, 5) — is at about 93 %. What
is left is almost all deployment, testing and write-up, which is where the remaining four
days have to go.

Legend: ✅ done · 🟡 in progress / partial · 🔴 blocked · ⬜ not started

---

## Review — 26 Sep 2026

### What changed today

| Area        | Change                                                                                                                                                                    | Evidence                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Security    | Next.js `15.0.0` → `15.5.26`. 15.0.0 is affected by CVE-2025-66478, the CVSS 10 React Server Components RCE, and Vercel would not have deployed it                        | `apps/web/package.json`                    |
| Runtime     | Node `20.20.2` → `22.23.2` in `.nvmrc`, Dockerfile and engines. Node 20 is end-of-life, and Vercel disables it for new builds on 1 Oct 2026                               | full gauntlet green on 22                  |
| OCR         | Live camera capture (`getUserMedia`, rear camera on phones, webcam on desktop) beside the file picker; greyscale and levels stretch before tesseract                      | `components/camera-capture.tsx`            |
| Qwen        | `POST /ocr` (Qwen-OCR), `POST /notes` (Qwen on unrecognised names), `GET /capabilities`. Off without `QWEN_API_KEY`; model output never reaches `score()`                 | `routes/assist.ts`, 21 tests               |
| Parser      | Headings, `[+/- …]` and `May contain:` blocks, trailing percentages, bullets, full-width commas; `Aqua/Water/Eau` resolves and still reports `Eau`                        | rubric §4.1 amendment                      |
| Safety      | A declared allergy that names nothing is reported to the user instead of silently never firing                                                                            | `profile.unresolvedAllergies`              |
| Performance | Fuzzy search 82 ms → 6.5 ms per label; ingredient search sort removed; id lookup O(1); annotated list rebuilt by merge, not by searching the text                         | synthetic 7,729-row benchmark, same output |
| Hygiene     | 8 unused dependencies removed (`bullmq`, `pino`, `@fastify/swagger`, two Supabase clients, React Query, react-hook-form, web `zod`), 6 dead exports and 2 duplicate types | lockfile −32 packages                      |
| Deploy      | `apps/web/vercel.json`; production build refuses to run without `NEXT_PUBLIC_API_URL`; security headers with `camera=(self)`; corpus warmed at boot                       | guard verified both ways                   |

Tests: **299**, up from 231 — shared 22, web 37, API 240. Format, lint, typecheck, test and
build all green. End to end against the live corpus, a deliberately messy label now reads
14 of 17 names in 15 ms, where before its heading, `Niacinamide 4%`, both slash names and
the `[+/- CI …]` block were all reported as unrecognised.

The API image builds exactly as Render will build it and boots on Node 22.23.2. Started with
no database, it answers `/health` and logs `corpus load failed` at boot, rather than leaving
the misconfiguration for the first user to find.

### Complexity, stated

| Step                         | Before                              | Now                                        |
| ---------------------------- | ----------------------------------- | ------------------------------------------ |
| Parse a label of length L    | O(L)                                | O(L)                                       |
| Resolve n names              | O(n) lookups, O(n·a) allergy check  | O(n) lookups, O(1) allergy check per match |
| Fuzzy, per unrecognised name | O(c·m²), one allocation per row     | O(c·k·m), no allocation (k = 2·budget + 1) |
| Ingredient search, K keys    | O(K + h log h) with `localeCompare` | O(K + N), no sort                          |
| Ingredient detail by id      | O(N)                                | O(1)                                       |
| Rebuild the annotated list   | O(n log n · L)                      | O(n)                                       |

Fuzzy search stays linear in the length-bucketed candidates on purpose. A BK-tree or
SymSpell index would make it sub-linear, but at 6.5 ms per label it is no longer where
the time goes, and either index costs memory and a second structure to keep correct.

### What stands between here and submission

In the order it fails worst if skipped.

**27 Sep — deploy.**

1. Commit today's work as the conventional commits listed below, push, and see CI green.
2. API to Render: create the service from the committed `render.yaml` Blueprint, set
   `DATABASE_URL`, `CORS_ORIGIN=https://<vercel-domain>` and `QWEN_API_KEY` in the
   dashboard (they are `sync: false` so they never enter the repo), deploy, and check
   `/health`, `/capabilities` and one `POST /analyze`. Frankfurt is the closest region
   Render offers; it has none in Africa.
3. Web to Vercel: import the repo, Root Directory `apps/web` (`vercel.json` carries the
   build and install commands, `engines` carries Node 22), set `NEXT_PUBLIC_API_URL` for
   Production and Preview, deploy. Then put the Vercel production domain in `CORS_ORIGIN`.
   `NEXT_PUBLIC_API_URL` is inlined at build time, so changing it later needs a redeploy.
4. Qwen: create a Model Studio key in the Singapore region (new accounts get a free quota)
   and set it only as a Render environment variable. OpenRouter's free Qwen models work
   through the same code by changing `QWEN_BASE_URL` and the two model names.
5. Real devices, over the https Vercel URL — the camera refuses plain http: iOS Safari,
   Android Chrome, one desktop webcam. Both readers, a curved bottle, a flat box.

**28 Sep — testing cycle.** Re-run `label-coverage.ts` over the 1,299 labels with the new
parser: the 69.3 % on the landing page predates it and should be re-measured, not assumed.
One Playwright smoke path (paste → verdict; camera with Chromium's fake media stream).
Five-person usability run on phones in the shop-aisle scenario.

**29 Sep — the thinnest honest Phase 6.** Local history of the last checks in
`localStorage`, and a "report a problem with this result" link. Recommendations of safer
products need `product_ingredients`, which stays empty for the reason measured in 1.3.

**30 Sep — write-up.** Rewrite `README.md` (it still describes the Phase 0 scaffold), an
architecture diagram, the evaluation figures, limitations, and data attribution.

### Not mentioned before, and worth deciding now

- **Supabase free projects pause after a week idle.** A paused database means a cold API
  machine cannot load the corpus. Either keep it active through the assessment window or
  bake a corpus snapshot into the API image — the data is read-only reference data and the
  API never writes, so the second removes the database from the request path entirely.
- **Cold starts in front of an assessor.** `min_machines_running = 0` means the first
  request after idle waits for a boot and an index build. Set it to 1 for the assessment
  window.
- **Preview deployments will fail CORS.** `CORS_ORIGIN` is an exact allowlist and every
  Vercel preview has a new hostname. Add a stable preview alias to the list.
- **`.env.bak` holds a second copy of the live `DATABASE_URL`.** It is gitignored, but it
  has no reason to exist; delete it.
- **tesseract.js fetches its engine and language data from jsDelivr at first use.**
  Self-hosting them removes a third-party runtime dependency and is a precondition for a
  strict Content-Security-Policy, which the web app does not have yet.
- **Privacy.** Choosing Qwen OCR sends the photo to Alibaba Cloud; the screen says so and
  the default is on-device. A short privacy page should say the same, and that the profile
  never leaves the browser except inside an analysis request.
- **Attribution.** Open Beauty Facts data is ODbL and requires attribution wherever it is
  used; the EU texts are reused under EUR-Lex terms. Both belong in the README.
- **Sentry for the web app** is still unwired; the API side only needs a DSN.

### Commits to make from today's working tree

| Message                                                                           | Files                                                      |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `fix(web): upgrade next to 15.5.26 for CVE-2025-66478`                            | `apps/web/package.json`, `pnpm-lock.yaml`                  |
| `chore: move the runtime to node 22 ahead of vercel's node 20 cut-off`            | `.nvmrc`, `package.json`, Dockerfile, README, CONTRIBUTING |
| `chore: remove eight dependencies nothing imports`                                | both `package.json`, `pnpm-lock.yaml`                      |
| `perf(matching): band the edit distance and index ids, ranks and exact names`     | `fuzzy.ts`, `matcher.ts`, `context.ts`, routes, tests      |
| `feat(matching): read label headings, may-contain blocks and slash-printed names` | `normalise.ts`, `matcher.ts`, rubric §4.1, tests           |
| `fix(matching): report a declared allergy that resolves to nothing`               | shared `analysis.ts`, `matcher.ts`, analyze route, tests   |
| `feat(api): read labels and describe unrecognised names with qwen`                | `assist/`, `routes/assist.ts`, `index.ts`, `.env.example`  |
| `feat(web): read a label live from the camera, on device or with qwen ocr`        | camera, capture, image, ocr-text, profile, api client      |
| `feat(web): show model notes and unresolved allergies beside the verdict`         | check page, model-notes, annotate, label, ingredient-row   |
| `chore(deploy): vercel config, security headers and a production url guard`       | `vercel.json`, `next.config.mjs`, `turbo.json`             |
| `docs: record the 26 sep review, the measured scope and the plan to submission`   | `projectplan.md`                                           |

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

| Item                                                                 | State                     |
| -------------------------------------------------------------------- | ------------------------- |
| Commit log below reconciled to `HEAD`                                | ✅ 15 Sep — 21 rows added |
| `main` is 10 commits ahead of `origin/main`                          | 🔴 **all of it unpushed** |
| Phase 0 deploy targets (Render, Vercel, Upstash) still unprovisioned | unchanged since 6 Aug     |

`annexV.MD` was committed by mistake on 14 Sep and untracked again on 15 Sep. `.gitignore`
keeps regulation reference copies out of the repo — they are large, redistributable only
under EUR-Lex terms, and not build inputs, because the citable facts live in the seed
files. The file stays in history on the unpushed commits; rewriting them to drop it is
still available and is the only moment it will be cheap.

---

## Next steps

_Superseded by the 26 Sep review above and kept as the 15 Sep record. Since then `main` has
been pushed and is level with `origin/main`, the synonym set has landed, and the web app
exists; the deploys in steps 3 and 5 are still outstanding._

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

### 3. Deploy the API to Render — half a day

Phase 0 has carried this as ⬜ since 6 August. The web app cannot be built against nothing,
and `render.yaml`, the `Dockerfile` and `TRUST_PROXY` are already in place, so this is
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

| Commit    | Message                                                                           | Phase |
| --------- | --------------------------------------------------------------------------------- | ----- |
| `a156452` | `chore: scaffold pnpm/turborepo monorepo with web, api and shared packages`       | 0     |
| `7a9252c` | `docs: add phase 1 data sourcing and scoring rubric`                              | 1     |
| `a7ce954` | `feat(data): seed 62 EU Annex III fragrance allergens from Regulation 2023/1545`  | 1     |
| `485cece` | `docs: record sourced annex III dataset in rubric and add project plan`           | 1     |
| `6afeb10` | `feat(data): validate annex III dataset against EU glossary and measure recall`   | 1     |
| `093e83b` | `feat(data): corroborate annex III dataset against a second identity source`      | 1     |
| `4a481e5` | `feat(data): seed annex III entries 67-92 and record two delisted substances`     | 1     |
| `ba625e1` | `docs: record closed recall gap and dual-status substances`                       | 1     |
| `65e770c` | `ci: resolve pnpm version conflict and pin node to .nvmrc`                        | 0     |
| `4f6d1ad` | `docs: mark remote CI green in project plan`                                      | 0     |
| `18211f9` | `feat(scoring): model Annex II prohibition as a regulatory status`                | 1     |
| `f1fae36` | `feat(db): add initial migration and re-verify the product corpus count`          | 1     |
| `82aac71` | `docs: record the seeded database state`                                          | 1     |
| `38f1824` | `feat(scoring): implement the precedence tree and make rule 5 fire`               | 1     |
| `ec91978` | `fix(scoring): stop rule 3 and rule 5 double-explaining one ingredient`           | 1     |
| `65b8b5c` | `chore: keep regulation reference copies out of version control`                  | 0     |
| `d83dae7` | `feat(data): complete the curated risk datasets and close the Annex II gap`       | 1     |
| `971f563` | `feat(matching): resolve printed ingredient labels to seeded ingredients`         | 5     |
| `e2c18d1` | `feat(matching): add spelling, common-name and fuzzy-suggestion strategies`       | 5     |
| `2f956e4` | `fix(scoring): give photosensitising ingredients a rule that can fire`            | 1     |
| `93aaf01` | `fix(api): fail closed on CORS and stop errors leaking internals`                 | 0     |
| `f2218d2` | `perf(matching): cache the ingredient index and bound fuzzy search`               | 5     |
| `0325b20` | `perf(db): batch the curated seeder into three statements`                        | 1     |
| `a33b86f` | `chore(deploy): pin the runtime and widen the health-check grace period`          | 0     |
| `5bc92b7` | `feat(api): rate limiting, error reporting, and a pool sized for this workload`   | 0     |
| `70a8d1f` | `fix(matching): split a comma with a digit on only one side`                      | 5     |
| `2a9427a` | `feat(api): serve analysis and ingredient lookup over HTTP`                       | 5     |
| `9f56a49` | `docs: reconcile the project plan with the measured database state`               | —     |
| `28ee8c4` | `fix(db): let the curated seeder carry a correction, not only an insert`          | 1     |
| `87f1d59` | `fix(data): cite the preservatives to Annex V and apply corrigendum R(02)`        | 1     |
| `f9dca93` | `docs: record rubric open items 2 and 4 as closed`                                | 1     |
| `088cb9a` | `perf(api): sort the corpus once per load instead of once per request`            | 5     |
| `40a1fa4` | `feat(data): seed a cited identity baseline so a clean product can read as Safe`  | 1     |
| `87a2f13` | `docs: record the identity baseline and the ceiling it does not clear`            | 1     |
| `e57afc6` | `docs: reconcile the commit log and write down what happens next`                 | —     |
| `c8f87df` | `feat(data): carry the Glossary's own synonyms so a label reading Water resolves` | 1     |
| `9e8ceb8` | `docs(web): bind design instructions before any UI is written`                    | 2     |
| `cf04698` | `refactor(shared): move the analyze wire contract out of the API`                 | 5     |
| `95d41cd` | `feat(web): build the label checker on the design rules`                          | 5     |
| `0dabd3f` | `feat(web): read a label from a photograph, on both phone and desktop`            | 4     |
| `57cba5e` | `feat(web): show what is on record for an ingredient, not only what fired`        | 5     |
| `2e54ea6` | `feat(web): build the landing page around the label itself`                       | 5     |
| `e2d0dfd` | `feat(web): reveal landing bands on scroll, in the direction they arrive from`    | 5     |
| `6da3011` | `fix(web): make the scroll reveal large enough and late enough to be seen`        | 5     |
| `c4e8306` | `feat(web): open and close the landing page on a treated photograph`              | 5     |
| `69e2b27` | `refactor(shared): move the ingredient search contract out of the API`            | 4     |
| `8cc7ea1` | `feat(web): build a label one ingredient at a time from the corpus`               | 4     |
| `fdca2d4` | `docs: add a windows setup path and correct two stale readme claims`              | 0     |

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
| Render project + API deployed                                      | ⬜                                    |
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
> is live and migrated, but Render, Vercel, Upstash and Sentry are still unprovisioned.

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
