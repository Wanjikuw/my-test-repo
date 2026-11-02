# Contributing — machine setup

Getting a second machine from nothing to a running dev environment. Commands are Windows
PowerShell; the bash equivalents are in [README.md](README.md) under "Manual setup checklist".

The two pins that matter and must not drift:

| Tool    | Version   | Source of truth                    |
| ------- | --------- | ---------------------------------- |
| Node.js | `22.23.2` | `.nvmrc`                           |
| pnpm    | `9.12.0`  | `packageManager` in `package.json` |

Anything else risks a lockfile diff or a CI-vs-local mismatch, both of which this project
has already been bitten by once (see the Phase 0 defect table in `projectplan.md`).

---

## 1. Prerequisites

Skip any you already have.

```powershell
winget install --id Git.Git -e --source winget
winget install --id CoreyButler.NVMforWindows -e --source winget
```

Reopen PowerShell so `PATH` picks up the new entries, then:

```powershell
nvm install 22.23.2
nvm use 22.23.2
node --version          # expect v22.23.2
```

No `winget`? Git is at git-scm.com and nvm-windows is on its GitHub releases page.

## 2. pnpm at the pinned version

Corepack ships with Node 20.

```powershell
corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm --version          # expect 9.12.0
```

`corepack enable` writes shims into the Node install directory and may need an elevated
PowerShell. If it fails with a signature or `keyid` error, corepack itself is stale:

```powershell
npm install -g corepack@latest    # then retry the two commands above
```

Last resort, which works fine:

```powershell
npm install -g pnpm@9.12.0
```

## 3. Clone and install

```powershell
git clone git@github.com:Wanjikuw/my-test-repo.git allergy-checker
cd allergy-checker

# --frozen-lockfile makes the install match pnpm-lock.yaml exactly, same as CI does.
pnpm install --frozen-lockfile
```

One command covers all three workspaces — `apps/api`, `apps/web`, `packages/shared`. It
also runs the `prepare` script, which installs the pre-commit hook. **Do not run
`husky init`**; `.husky/pre-commit` already exists and init would overwrite it.

### If the install 403s behind a corporate mirror

```powershell
pnpm config get registry
pnpm install --registry=https://registry.npmjs.org/
```

`.npmrc` deliberately pins no registry, so the install inherits whatever the environment
provides. If public npm is itself proxy-blocked you need registry credentials or an
off-network machine.

### A note on WSL

This project is developed inside WSL Ubuntu, not over the `\\wsl.localhost` share. If you
work in WSL, run the Linux equivalents of the above **inside** the distro and keep the repo
on the Linux filesystem. Mixing a Windows `pnpm` against a repo on the share is what
produced the husky `PATH` and CRLF defects recorded in `projectplan.md`.

## 4. Environment file

```powershell
Copy-Item .env.example .env
code .env
```

Values that must be supplied by hand — the rest have working local defaults:

| Variable                        | Used by | Notes                                                                                                                                                                     |
| ------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                  | api     | Supabase **IPv4 session pooler**, not `db.<ref>.supabase.co` — that host is AAAA-only and unreachable from WSL. Percent-encode the password and append `sslmode=require`. |
| `SUPABASE_URL`                  | api     | Server-side only                                                                                                                                                          |
| `SUPABASE_SERVICE_ROLE_KEY`     | api     | Server-side only. Never prefix `NEXT_PUBLIC_` — it bypasses RLS                                                                                                           |
| `NEXT_PUBLIC_SUPABASE_URL`      | web     | Browser-visible                                                                                                                                                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web     | Browser-visible                                                                                                                                                           |
| `QWEN_API_KEY`                  | api     | Optional — remote OCR and model notes are off when empty. Server-side only; never `NEXT_PUBLIC_`                                                                          |
| `SENTRY_DSN`                    | api     | Optional — reporting is skipped when empty, so local dev stays offline                                                                                                    |
| `ALERT_WEBHOOK_URL`             | api     | Optional — Slack or Discord incoming webhook; each 5xx posts there, at most once a minute. The URL is the credential: server-side only                                    |
| `NEXT_PUBLIC_SENTRY_DSN`        | web     | Optional — same no-op-when-empty behavior. DSNs aren't secret, so the `NEXT_PUBLIC_` prefix is fine                                                                       |
| `SENTRY_AUTH_TOKEN`             | web     | Optional, build-time only — uploads source maps on `next build`; missing it just skips the upload                                                                         |

Send credentials through a password manager or a secrets store. Not chat, not email.
`.env` is gitignored and must stay that way.

## 5. Database

Only needed if you are touching the schema or the seed data. The shared Supabase project is
already migrated and seeded.

```powershell
pnpm --filter @allergy-checker/api db:migrate
pnpm --filter @allergy-checker/api seed:curated
pnpm --filter @allergy-checker/api seed:prohibited
pnpm --filter @allergy-checker/api seed:skin-types
pnpm --filter @allergy-checker/api seed:identity
```

The seeders are upserts and safe to re-run — that was a deliberate fix, since the earlier
`onConflictDoNothing` versions silently ignored corrections.

## 6. Verify

The same five steps CI runs. All must pass before you push. `pnpm verify` runs them in one
go.

```powershell
pnpm format:check
pnpm turbo run lint
pnpm turbo run typecheck
pnpm turbo run test
pnpm turbo run build
```

Tests are hermetic: `apps/api/vitest.config.ts` blanks `DATABASE_URL` and the other service
variables, so a developer's `.env` can never make a test pass that fails on CI. A module that
needs a database when it is imported fails here, with the same error CI reports. Load the
client with a dynamic `import()` inside the function that needs it instead; an ESLint rule
enforces this outside `src/db`.

`format:check` failing on a fresh clone usually means an editor reformatted something — run
`pnpm format` once and commit the result.

Build order is handled by Turborepo's `^build`: `packages/shared` compiles to `dist/` and
both apps consume it from there, not as raw TypeScript. That is why these go through
`turbo` rather than calling `tsc`/`next` directly.

## 7. Run it

Two terminals.

```powershell
pnpm --filter @allergy-checker/api dev      # Fastify on :3001
pnpm --filter @allergy-checker/web dev      # Next.js on :3000
```

Sanity check the API on its own:

```powershell
Invoke-RestMethod http://localhost:3001/health
```

## 8. Before your first commit

Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/): a
`commit-msg` hook runs commitlint and rejects anything else, for example `fix(api): load the
database client lazily`. The pre-commit hook runs `eslint --fix` and `prettier --write` over
staged files. A commit that fails either hook is the hook working, not a bug — read the
output rather than reaching for `--no-verify`.

## 9. Security advisories

`pnpm audit` is a moving target: between 12 Oct and 2 Nov 2026 it gained a critical in `next`, a
high in `zod`, and advisories in `fastify`, `fast-uri`, `vitest`, `minimatch` and `glob`, without
a line of this repository changing. So the gate is defined here, and it is checked again
whenever dependencies move.

**The gate is `pnpm audit --prod --audit-level=high`, and it must exit 0.** Anything at high or
critical in the production tree is fixed, not accepted. The full tree (`pnpm audit`) must have
no critical.

Advisories below the gate are accepted only when they are in build or development tooling, or
reach no code path this project runs, and only when no compatible fix exists. Each one is
listed here with the reason, so that a later reader can tell a decision from an oversight.

| Advisory                                        | Why it is accepted                                                                                                                                                                                                               | Revisit when                             |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `esbuild` 0.18, moderate (dev server CORS)      | Arrives through drizzle-kit's loader. Only esbuild's own dev server is affected, and nothing here starts it.                                                                                                                     | drizzle-kit drops `@esbuild-kit/*`       |
| `minimatch` < 11, moderate (pattern DoS)        | Pulled in by eslint (3.x) and by `glob` in the Sentry bundler plugin (10.x), and only ever given patterns this repository wrote. Fixed only in 11, which neither parent accepts yet.                                             | eslint or `glob` moves to minimatch 11   |
| `glob` 13, moderate (abort signal not honoured) | Used by the Sentry bundler plugin during `next build`, over this project's own build output. It only matters to a caller that relies on an abort signal to stop a walk early. Fixed in 14, which the plugin does not yet accept. | `@sentry/bundler-plugins` allows glob 14 |

### Overrides

The root `package.json` carries `pnpm.overrides` for transitive dependencies that `pnpm audit`
flags and whose parents have not yet released a fix. Each entry names only the vulnerable
range, so a package already on a safe version, or on an older major, is left alone. They are
temporary: when `pnpm audit --prod` stays clean with an entry removed, delete it.

| Override                   | Advisory                                                                    | Pulled in by                                 |
| -------------------------- | --------------------------------------------------------------------------- | -------------------------------------------- |
| `postcss`, `source-map-js` | File read and XSS through source-map handling; source-map denial of service | `next`, which pins postcss 8.4.31 exactly    |
| `sharp`                    | Vulnerability in the librsvg it bundles (this site serves no SVG)           | `next` (optional)                            |
| `brace-expansion`          | Denial of service through brace expansion (1.x and 5.x are both overridden) | `eslint`'s config packages, `@sentry/nextjs` |
| `fast-uri`                 | Host normalisation and mailto header injection                              | `fastify`                                    |
| `ip-address`               | Allowlist bypass and an unbounded diagnostic                                | `@fastify/rate-limit`                        |

### Majors taken for security

`zod` is on 4 because the advisory against 3.x had no backport. The exposure was real: before
4.6.6 a 1 MiB request body of oversized arrays blocked the API for about 1.5 seconds, grew it by
about 300 MiB and was answered with a 30 MB error message. A test in
`apps/api/src/routes/analyze.test.ts` pins that behaviour. `vitest` was likewise moved off 2.x
for critical tooling advisories, and is now on 5.

## 10. Dependency updates

Dependabot opens PRs weekly (`.github/dependabot.yml`). Minor and patch updates are grouped; a
major gets its own PR, so one that cannot be taken yet cannot hold up the others. A Dependabot
branch is cut from `main` as it was at the time, so its CI is red until it is rebased (comment
`@dependabot rebase`), and Dependabot closes a PR by itself once `main` already satisfies it.

A major is merged only after it has been exercised on something that fails if the upgrade
changes behaviour, not merely installed. The recent ones were checked like this: ESLint 10 (lint
passes, and a deliberate violation is still reported), lint-staged 17 (tried on real staged
files, including one that must block the commit), `@fastify/cors` 11 (a header-level test, and a
before and after diff over eleven request shapes) and dotenv 18 (the production boot log, before
and after).

Some majors are declined on purpose and ignored in the config. Each is listed with the reason
and what would change the decision.

| Ignored                                                         | Why                                                                                                                                                                                                                    | Revisit when                    |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| TypeScript 7 and later                                          | It ships no JS compiler API, which typescript-eslint needs, and typescript-eslint supports TypeScript below 6.1. TypeScript 6.x is still proposed.                                                                     | typescript-eslint supports 7    |
| `@types/node` majors                                            | The types have to describe the runtime, which is Node 22. A newer major would let code use APIs the deployed runtime lacks.                                                                                            | the runtime moves off Node 22   |
| `react`, `react-dom`, `@types/react`, `@types/react-dom` majors | React 19 is a migration: the four move together (one Dependabot PR bumped `react` and left `react-dom` on 18, which is not a supported pairing), and Next, Sentry and zustand have to be checked against it.           | a planned React 19 migration    |
| `node` Docker image majors                                      | The runtime is pinned to Node 22 in `.nvmrc`, `engines`, Vercel and the Dockerfile. Moving it is a platform decision, due before Node 22 leaves maintenance in April 2027. Patch and minor updates of 22 still arrive. | the runtime is moved on purpose |
