# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# KidsLearn web
#
# Uses Next.js standalone output so the runtime image ships only the traced
# server and its assets rather than the whole node_modules tree.
# ---------------------------------------------------------------------------

FROM node:22-alpine AS base
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /app

# --- dependencies ----------------------------------------------------------
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/
COPY packages/database/package.json packages/database/
COPY packages/config/package.json packages/config/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# --- build -----------------------------------------------------------------
FROM deps AS build
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1

COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm --filter @kidslearn/types build \
 && pnpm --filter @kidslearn/web build

# --- runtime ---------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
