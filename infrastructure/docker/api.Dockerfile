# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# KidsLearn API
#
# Multi-stage so the runtime image carries no toolchain and no source: only
# production dependencies, the compiled output and the generated Prisma client.
# Runs as a non-root user.
# ---------------------------------------------------------------------------

FROM node:22-alpine AS base
RUN corepack enable && apk add --no-cache libc6-compat openssl
WORKDIR /app

# --- dependencies ----------------------------------------------------------
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
COPY packages/database/package.json packages/database/
COPY packages/config/package.json packages/config/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# --- build -----------------------------------------------------------------
FROM deps AS build
COPY prisma ./prisma
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm exec prisma generate --schema prisma/schema.prisma \
 && pnpm --filter @kidslearn/types build \
 && pnpm --filter @kidslearn/api build

# Strip dev dependencies from the tree that will be copied into the runtime.
RUN pnpm --filter @kidslearn/api --prod deploy /tmp/api-runtime

# --- runtime ---------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
ENV API_PORT=4000

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S kidslearn -G nodejs

COPY --from=build --chown=kidslearn:nodejs /tmp/api-runtime/node_modules ./node_modules
COPY --from=build --chown=kidslearn:nodejs /app/apps/api/dist ./dist
COPY --from=build --chown=kidslearn:nodejs /app/packages/database/generated ./packages/database/generated
COPY --from=build --chown=kidslearn:nodejs /app/prisma ./prisma

USER kidslearn
EXPOSE 4000

# The orchestrator gates traffic on readiness, which also checks the database.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
