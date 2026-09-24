# Simple single-stage build — fine for an MVP; revisit multi-stage only if image size
# or build time actually becomes a problem, not preemptively.
# Pinned to the exact version in .nvmrc. A floating 20-slim tag would let the image
# drift onto a runtime CI never tested.
FROM node:26.9.0-slim

WORKDIR /app

# Copy the whole monorepo context so pnpm workspace resolution (workspace:*) works —
# Fly.io's build context must be the repo root for this Dockerfile to work, not apps/api.
# tsconfig.base.json is required: both package tsconfigs extend it.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json .npmrc ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

# Pinned to match packageManager in the root package.json, for the same reason.
RUN npm install -g pnpm@9.12.0 && pnpm install --frozen-lockfile

# shared must be compiled before api: api consumes it as ./dist, not as raw TypeScript.
RUN pnpm --filter @allergy-checker/shared build \
  && pnpm --filter @allergy-checker/api build

ENV NODE_ENV=production
USER node

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/index.js"]
