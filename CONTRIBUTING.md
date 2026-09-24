# Contributing — machine setup

Getting a second machine from nothing to a running dev environment. Commands are Windows
PowerShell; the bash equivalents are in [README.md](README.md) under "Manual setup checklist".

The two pins that matter and must not drift:

| Tool    | Version   | Source of truth                    |
| ------- | --------- | ---------------------------------- |
| Node.js | `20.20.2` | `.nvmrc`                           |
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
nvm install 20.20.2
nvm use 20.20.2
node --version          # expect v20.20.2
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
| `REDIS_URL`                     | api     | Optional — no consumer yet                                                                                                                                                |
| `SENTRY_DSN`                    | api     | Optional — reporting is skipped when empty, so local dev stays offline                                                                                                    |

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

The same five steps CI runs. All must pass before you push.

```powershell
pnpm format:check
pnpm turbo run lint
pnpm turbo run typecheck
pnpm turbo run test
pnpm turbo run build
```

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

Conventional Commits are enforced from commit #1 and the pre-commit hook runs
`eslint --fix` and `prettier --write` over staged files. A commit that fails the hook is the
hook working, not a bug — read the output rather than reaching for `--no-verify`.
