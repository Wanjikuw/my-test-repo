# Cosmetic Ingredient Allergy Checker — Phase 0 Scaffold

This is the Phase 0 deliverable: an empty-but-running monorepo. It proves the wiring works
before any real feature code is written. What's here:

- `apps/web` — Next.js 15 shell (placeholder homepage)
- `apps/api` — Fastify API with one working route: `GET /health`
- `packages/shared` — Zod schemas for the scoring/matching contract (already encodes the
  finalized rule table from `Phase1_Data_Sourcing_and_Scoring_Rubric.md`)

## What I could not do for you

I don't have your credentials or network access to actually provision or deploy anything.
Everything below is on you — follow it in order.

**Nothing in this repo has been executed.** The machine it was assembled on had no Node
runtime, and once one was installed its npm traffic was routed through an authenticated
internal mirror that returned `403` for `next@15.0.0`, with public npm unreachable. So
`pnpm install` has never completed here, and lint/typecheck/test/build have never run.

Every manifest, tsconfig, and config file was corrected by inspection and is internally
consistent, but **treat your first `pnpm install` as the real test**, not a formality.
The things most likely to need a nudge are version resolutions that only a solver can
settle: Tailwind v4 with Next 15, `typescript-eslint` v8 with ESLint 9, and the
React 18 / Next 15 peer range. Expect to adjust a version or two rather than assuming
it is all correct first time.

## Deliberately not in this scaffold

These are known gaps, not oversights. Each needs real code or a real credential, so they
belong to the phase that first uses them:

- **Sentry SDK** — no `@sentry/*` dependency yet. Add it when you wire the DSN (Phase 0
  tail), not before; an unwired SDK is just install weight.
- **`@fastify/helmet` and `@fastify/rate-limit`** — the API has no auth and no user-facing
  routes yet. Add both in the same PR that adds the first non-`/health` route.
- **Supabase JWT verification** — `apps/api` connects via `DATABASE_URL` as the table
  owner, which **bypasses RLS entirely**. The policies in `drizzle/manual/` currently only
  protect direct browser-to-Supabase access. Before the API serves any user data, it must
  verify the Supabase JWT and assume the `authenticated` role per request, or the RLS
  design is decorative.
- **Playwright** — removed from `apps/web` devDependencies. It was installed with no
  config and no tests, and its postinstall downloads browser binaries on every CI install.
  Re-add it together with the first E2E test.
- **`eslint-config-next`** — not added. It is eslintrc-format and needs `FlatCompat` plus a
  large plugin tree to work with this flat config; the shared root config already lints
  `.tsx`. Revisit if you want `next/core-web-vitals` rules specifically.
- **Scoring and matching engines, indexes for INCI fuzzy matching, and the
  `skin_profiles`/`history`/`feedback` tables** — Phase 1+ feature work.

## Manual setup checklist (Phase 0)

### 1. Local install

#### 1a. Prerequisites

| Tool    | Version                             | Notes                                                                                                  |
| ------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Node.js | 20.11+ (20.18.0 pinned in `.nvmrc`) | CI and the API Dockerfile both use Node 20. Don't develop on a newer major without also bumping those. |
| pnpm    | 9.12.0 (pinned in `packageManager`) | Anything else risks a lockfile diff.                                                                   |

```bash
# If you use nvm / nvm-windows:
nvm install 20.18.0
nvm use 20.18.0

# Get pnpm at the exact pinned version (corepack ships with Node):
corepack enable
corepack prepare pnpm@9.12.0 --activate

node --version    # expect v20.18.x
pnpm --version    # expect 9.12.0
```

If `corepack` is unavailable, `npm install -g pnpm@9.12.0` works too.

#### 1b. Install dependencies

```bash
cd allergy-checker
pnpm install
```

That single command installs all three workspaces (`apps/api`, `apps/web`,
`packages/shared`) — there is no need to install per-package. It also runs the `prepare`
script, which sets up the pre-commit hook already defined in `.husky/`. Do **not** run
`husky init`; it would overwrite the existing hook.

#### 1c. If the install 403s or hangs on a corporate network

This is the failure mode to expect on a managed laptop. If your global npm config points
at an internal mirror, some packages may not be mirrored and you'll get
`ERR_PNPM_FETCH_403` (this happened here on `next@15.0.0`). Check what registry you're
actually resolving against:

```bash
pnpm config get registry
cat ~/.npmrc        # Windows: type %USERPROFILE%\.npmrc
```

If it is not `https://registry.npmjs.org/`, install against public npm explicitly:

```bash
pnpm install --registry=https://registry.npmjs.org/
```

If public npm is itself blocked by your proxy, you'll need either registry credentials
(`pnpm login`) or an off-network machine to produce the lockfile. The repo deliberately
does **not** pin a registry in `.npmrc`, so it inherits whatever your environment provides.

#### 1d. Commit the lockfile

**`pnpm-lock.yaml` is not in this repo yet** — it can only be produced by a real install,
and the machine this scaffold was assembled on could not reach a registry that serves every
package. Generate it and commit it before anything else:

```bash
pnpm install          # creates pnpm-lock.yaml
git add pnpm-lock.yaml
git commit -m "chore: add pnpm lockfile"
```

CI runs `pnpm install --frozen-lockfile` and `apps/api/Dockerfile` copies the lockfile —
**both fail until this is committed.** This is the single hard prerequisite for every step
below.

#### 1e. Verify the install locally

Run the same sequence CI runs. All five must pass before you push:

```bash
pnpm format:check
pnpm turbo run lint
pnpm turbo run typecheck
pnpm turbo run test
pnpm turbo run build
```

`pnpm format:check` failing is normal on a fresh checkout if your editor reformats — run
`pnpm format` once and commit the result.

Note on build order: `packages/shared` compiles to `dist/` and both apps consume it from
there, not as raw TypeScript. Turborepo's `^build` dependency handles the ordering
automatically, which is why the commands above go through `turbo` rather than calling
`tsc`/`next` directly.

Useful per-package commands once the install is clean:

```bash
pnpm --filter @allergy-checker/api dev      # Fastify on :3001
pnpm --filter @allergy-checker/web dev      # Next.js on :3000
pnpm --filter @allergy-checker/shared build # compile shared types only
```

### 2. Supabase

1. Create a project at supabase.com.
2. Copy `.env.example` to `.env` at the repo root, then fill it in.
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are **server-only** — the API reads these.
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are the browser-visible
     pair. Next.js only inlines `NEXT_PUBLIC_*` into the client bundle, so the un-prefixed
     names are invisible to browser code. Never give the service role key a
     `NEXT_PUBLIC_` prefix — that publishes an RLS-bypassing credential to every visitor.
3. Copy the Postgres connection string into `DATABASE_URL`.
4. **Do this before writing a single table:** in the Supabase SQL editor, confirm Row Level
   Security is enabled by default on new tables in your project settings. Every table created
   from Phase 1 onward must have RLS policies — this is a non-negotiable from the original
   stack requirements, not optional hardening.

### 3. Upstash Redis

1. Create a Redis database at upstash.com.
2. Copy the connection URL into `REDIS_URL` in `.env`.
3. This is used **only** for the OCR job queue (Phase 4) — if you find yourself reaching for
   it anywhere else, stop and reconsider; that was the scope agreed on.

### 4. Sentry

1. Create a project (Node platform for the API; a separate one for the web app if you want
   frontend error tracking too).
2. Copy the DSN into `SENTRY_DSN`. Wiring the SDK into `apps/api/src/index.ts` and
   `apps/web` is a Phase 0 task once you have the DSN — not done in this scaffold since it
   needs your real key to test against.

### 5. GitHub repo

```bash
git init
git add .
git commit -m "chore: phase 0 scaffold"
```

Push to a new GitHub repo. The CI workflow at `.github/workflows/ci.yml` runs automatically
on push — it format-checks, lints, typechecks, tests, and builds. It should go green on this
first commit with no real feature code yet, **provided `pnpm-lock.yaml` is in that commit**
(step 1d) — CI installs with `--frozen-lockfile` and will fail immediately without it.
If CI doesn't go green, that's a Phase 0 blocker to fix before Phase 1 starts, not something
to carry forward.

`.github/dependabot.yml` is also wired up (weekly npm, GitHub Actions, and Docker updates).
It does nothing until the repo is on GitHub.

Note: `turbo.json` is configured for caching but **not** wired to Turborepo's remote cache
service yet — that requires a `TURBO_TOKEN`/`TURBO_TEAM` and is worth skipping until CI run
times actually become a problem. Don't spend Phase 0 time on it now.

### 6. Vercel (web deployment)

1. Import the GitHub repo into Vercel.
2. Set the root directory to `apps/web`.
3. Override the build command to `cd ../.. && pnpm turbo run build --filter=@allergy-checker/web`.
   This is required: `apps/web` depends on `@allergy-checker/shared`, which must be compiled
   to `dist/` before `next build` can resolve it. A bare `next build` will fail.
4. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_API_URL`
   as Vercel project env vars. Do **not** add `SUPABASE_SERVICE_ROLE_KEY` here.
5. Deploy. You should get a live URL showing the Phase 0 placeholder homepage.

### 7. Fly.io (API deployment)

1. Install the `flyctl` CLI, run `fly auth login`.
2. Run `fly launch` **from the repo root**, not from `apps/api` — the Dockerfile needs the
   whole monorepo as its build context to resolve the pnpm workspace. A `fly.toml` is already
   committed at the root and already points at port 3001; if `fly launch` offers to overwrite
   it, decline, and just change the `app` name to whatever Fly assigns you.
3. Set secrets: `fly secrets set DATABASE_URL=... REDIS_URL=... SENTRY_DSN=...`
   (`NODE_ENV` and `PORT` are already in `fly.toml` — secrets are for credentials only.)
4. Deploy with `fly deploy`.
5. Confirm `https://<your-app>.fly.dev/health` returns `{"status":"ok",...}`.

## Definition of done for Phase 0

- [ ] `pnpm install` runs clean locally **and `pnpm-lock.yaml` is committed**
- [ ] CI is green on a no-op commit
- [ ] Web app is live on a Vercel URL (placeholder page is fine)
- [ ] API is live on a Fly.io URL and `/health` returns 200
- [ ] Supabase project exists, `DATABASE_URL` confirmed working
- [ ] Upstash Redis project exists (not yet used — just provisioned)
- [ ] Sentry DSN captured (SDK wiring can follow once you're testing against it)

Once every box above is checked, Phase 0 is genuinely done — not "code is written," but
"the whole path from commit to live deployment actually works." That's the bar, because
Phase 1 onward assumes this pipe already works and builds features on top of it, not
around it.

## Phase 1 — running the dataset seed (once Supabase is live)

These scripts run with `apps/api` as the working directory but read `.env` from the **repo
root** (`drizzle.config.ts` and `src/db/client.ts` both load `.env` then `../../.env`, so a
local `apps/api/.env` wins if you'd rather keep API secrets separate). If `DATABASE_URL`
isn't set you'll get an explicit error naming the variable, not a cryptic driver failure.

From `apps/api`, in order:

```bash
pnpm db:generate     # drizzle-kit reads src/db/schema.ts, generates SQL migrations
pnpm db:migrate       # applies them to your Supabase Postgres instance
```

Then apply `drizzle/manual/0001_rls_policies.sql` manually in the Supabase SQL editor —
drizzle-kit doesn't manage RLS policies, so this file is not auto-applied. It lives in
`drizzle/manual/` rather than `drizzle/` precisely so drizzle-kit's generated migrations
can't collide with it. Do this before seeding any data; RLS must be on before real rows
exist, not after.

```bash
pnpm seed:curated     # seeds the curated fragrance-allergen + preservative-sensitizer list
pnpm seed:obf /path/to/en_openbeautyfacts_org_products.csv    # imports the filtered ~1,552 rows
```

`seed:curated` is a **starting list, not a finished one** — `src/db/seed/curated-risk-data.ts`
has explicit `TODO`s for the remaining Annex III fragrance allergens and the three
literature-curated categories (`common_irritant`, `comedogenic`, `photosensitizing`) that
don't have a single regulatory source to pull from. That research and data entry is real
Phase 1 work — this script gives you the pipeline, not the finished dataset.

**None of this has been run or tested against a real database** — I don't have your
Supabase credentials or network access. Treat the first real run of `db:generate` /
`db:migrate` as the actual test of this code, and expect to debug it rather than assume
it works perfectly on the first try.
