# KidsLearn

A production-ready learning platform for children aged 1–7: a playful child app, a data-rich
parent dashboard and a full content admin, on a real NestJS + PostgreSQL backend.

> **Learning that feels like playing.**

---

## Architecture

```
                          KidsLearn
                              │
              ┌───────────────┼───────────────┐
            Child           Parent          Admin
              └───────────────┼───────────────┘
                              │
                     Next.js 16 (App Router)
                              │
                       TanStack Query
                              │
                        REST · /api/v1
                              │
                        NestJS 11
                              │
     ┌───────────┬────────────┼────────────┬────────────┐
    Auth      Content       Games       Progress      Admin
     └───────────┴────────────┼────────────┴────────────┘
                              │
                           Prisma
                              │
                        PostgreSQL 16
                              │
              ┌───────────────┼───────────────┐
            Redis           MinIO         AI provider
              │           (S3-compatible)   (optional)
           BullMQ
```

| Package               | What it is                                                     |
| --------------------- | -------------------------------------------------------------- |
| `apps/web`            | Next.js 16, React 19, Tailwind v4 — three product surfaces      |
| `apps/api`            | NestJS 11 REST API, Swagger at `/api/docs`                      |
| `packages/types`      | The API contract plus pure domain rules shared by both apps     |
| `packages/database`   | Generated Prisma client                                         |
| `packages/config`     | Shared TypeScript config                                        |
| `prisma/`             | Schema, migrations, seed                                        |
| `infrastructure/`     | Dockerfiles                                                     |

**`packages/types` is the contract.** Age bands, level curves, star awards and streak rules live
in `src/domain.ts` and are imported by both the API and the web app, so an optimistic UI update
and the server's authoritative answer are computed by the same function.

---

## Getting started

```bash
pnpm install
cp .env.example .env
pnpm infra:up          # Postgres, Redis, MinIO (unusual host ports; nothing to clash with)
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev               # api on :4000, web on :3000
```

Then open <http://localhost:3000>. Swagger lives at <http://localhost:4000/api/docs>.

### Development accounts

> **LOCAL DEVELOPMENT ONLY.** Created by `pnpm db:seed`, never present in a real deployment.

| Role   | Email                   | Password        |
| ------ | ----------------------- | --------------- |
| Parent | `parent@kidslearn.app`  | `kidslearn2026` |
| Admin  | `admin@kidslearn.app`   | `kidslearn2026` |

The seed also creates four other families, seven children across all three age bands, nine
subjects, nine lessons, all six games with 35 real questions, ten achievements and ninety days of
learning history — so every chart, streak and leaderboard has something honest to show.

---

## Commands

```bash
pnpm dev                 # both apps
pnpm build               # types → api → web
pnpm lint                # eslint, zero warnings tolerated
pnpm typecheck           # tsc across every package
pnpm test                # unit tests
pnpm --filter @kidslearn/api test:integration   # integration tests (needs the stack)
pnpm test:e2e            # Playwright journeys (needs a seeded, running stack)

pnpm db:migrate          # create + apply a migration
pnpm db:deploy           # apply pending migrations (production)
pnpm db:seed             # reset and re-seed development data
pnpm db:studio           # Prisma Studio

pnpm infra:up            # start Postgres, Redis, MinIO
pnpm infra:down          # stop them
```

---

## Database

PostgreSQL via Prisma. Conventions the schema holds to:

- **Translatable content lives in a `*Translation` side table** keyed by `(parentId, locale)`. A
  lesson is never duplicated per language.
- **Lessons are ordered typed blocks**, not one JSON document, so a new block type is a migration
  rather than a rewrite. `Json` is used only for genuinely type-specific configuration (a puzzle's
  tiles, an achievement's condition) and is documented where it appears.
- **Age is never stored.** `Child.dateOfBirth` is the only source; age and age band are derived on
  every read, so a birthday changes what a child can see without a job.
- **Aggregates are materialised.** `Progress` (per child), `DailyStat` (per child per day) and
  `LeaderboardEntry` are written on the write path, so no dashboard scans attempt tables.
- **Media binaries never touch Postgres** — only the object key and metadata.
- Indexes cover every foreign key a list query filters on; soft deletes on `User`, `Child`,
  `Lesson`, `Game` and `Media`.

### Migrations

```bash
pnpm db:migrate --name add_something   # development
pnpm db:deploy                         # production; also a compose service
```

CI additionally runs `prisma migrate diff --exit-code` so a schema edited without a migration
fails the build rather than a deploy.

---

## API

`/api/v1`, documented at `/api/docs`. Every response uses the same envelope:

```json
{ "success": true, "data": { }, "meta": { "page": 1, "limit": 20, "total": 137, "totalPages": 7 } }
```

```json
{ "success": false, "error": { "code": "CHILD_NOT_FOUND", "message": "We couldn't find that child." } }
```

Error codes are stable strings the frontend branches on. Stack traces, Prisma messages and table
names never reach a client.

**Modules:** `auth · children · content (subjects, categories, lessons) · games · progress
(achievements, rewards) · statistics · leaderboard · notifications · media · ai · certificates ·
admin · feature-flags · audit · queue · health`

---

## Authentication and authorization

- **Passwords** — Argon2id (19 MiB, t=2), above the OWASP floor. A wrong password and a missing
  account take the same path and return the same body, so the endpoint is not an account oracle.
- **Access token** — short-lived JWT, sent as `Authorization: Bearer`, held in memory on the
  client only. Never in `localStorage`.
- **Refresh token** — 384 bits of CSPRNG, stored hashed, delivered in an `HttpOnly` cookie scoped
  to `/api/v1/auth`. Rotated on every use; presenting a spent token revokes the whole family,
  because reuse means it leaked.
- **Guards are global.** `JwtAuthGuard` and `RolesGuard` are registered app-wide, so a route
  without a decorator fails closed. Public routes opt out explicitly with `@Public()`.
- **Ownership** goes through one service, `ChildAccessService`, which every child-scoped route
  calls. Another family's child returns **404, not 403** — 403 would confirm the id exists.

Frontend route guards exist, but they are UX only. Authorization is enforced server-side and
proven by integration tests.

---

## What is real, and what is not

This is the part worth reading before judging any screen.

**Real, backed by PostgreSQL:** authentication and sessions, children and derived ages, the
lesson and game catalogues with their publishing workflow, game sessions and server-side grading,
attempts with idempotency, XP, stars, levels, timezone-safe streaks, per-subject accuracy,
achievements, rewards, the activity feed, statistics, the leaderboard, notifications, media on
S3-compatible storage, PDF certificates, feature flags and the audit log.

**Honest fallbacks, labelled in the UI:**

- **AI image generation.** With no provider configured, the job is stored as `PREVIEW_ONLY`, the
  output is a placeholder that says so, and the admin screen shows "Preview mode". Set
  `AI_IMAGE_PROVIDER=openai` and `AI_IMAGE_API_KEY` to use a real model — the review and approval
  pipeline around it is already the real one.
- **Recommendations** are rule-based by default and always available. The provider interface is
  in place; nothing about the product depends on an AI API being reachable.
- **Web push** reports `configured: false` until VAPID keys are set, and the UI presents it as
  needing configuration rather than offering a button that cannot work.
- **Voice control** uses the Web Speech API where the browser has it and hides itself where it
  does not. Every voice action also has a visible control.

No endpoint returns a fabricated success for a failed integration.

---

## Testing

| Layer           | What it covers                                                                    | Command |
| --------------- | --------------------------------------------------------------------------------- | ------- |
| **Unit**        | Age and band derivation, level curve, star and XP awards, streaks across midnight, months and timezones, medal thresholds | `pnpm --filter @kidslearn/api test` |
| **Integration** | Envelope shape, auth, token rotation and replay detection, RBAC, cross-family isolation, published-only visibility, server-side grading, attempt idempotency, leaderboard privacy, AI honesty | `pnpm --filter @kidslearn/api test:integration` |
| **E2E**         | Sign in, add child, play a game and see the score reach the dashboard, admin console, guards, four breakpoints, dark mode | `pnpm test:e2e` |

Integration tests run against a dedicated `kidslearn_test` database and truncate between suites;
`PrismaService.resetForTests()` refuses to run unless `NODE_ENV=test`.

---

## Security

Helmet, CORS with an explicit origin allowlist, per-route rate limiting, DTO validation with
`forbidNonWhitelisted`, global auth and role guards, ownership checks, Argon2id, rotating refresh
tokens with reuse detection, parameterised queries through Prisma, and an audit log of
consequential admin actions.

**Uploads** are typed by magic bytes, not the declared `Content-Type`; the extension must agree
with the content; SVGs containing script or external references are rejected; object keys are
generated, never taken from the client's filename.

**Logs** redact `authorization`, `cookie`, `set-cookie` and every password or token field.

**Configuration** refuses to boot in production on a default or short JWT secret.

---

## Environment

See [`.env.example`](.env.example) — every variable is documented there. Nothing secret is ever
prefixed `NEXT_PUBLIC_`; the browser only ever receives the API and app URLs.

Minimum to run: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.
Optional: `REDIS_URL` (caching and jobs degrade gracefully without it), S3 credentials,
`AI_IMAGE_PROVIDER` + key, VAPID keys.

---

## Docker

```bash
# Local infrastructure only
pnpm infra:up

# Full production-like stack (builds web + api)
docker compose -f docker-compose.prod.yml up --build
```

Both images are multi-stage, run as a non-root user, and carry health checks. The web image uses
Next's standalone output. Migrations run as their own one-shot `migrate` service rather than from
the API process, so a rolling deploy cannot race itself.

---

## Product scope notes

Three content groups are intentionally **not** CMS-managed, interpreted against the requirement
that an administrator can manage platform content:

- **Lessons, subjects, categories, media, AI assets, feature flags and announcements** are fully
  manageable from the admin console against live endpoints — this is the platform's content.
- **The curated shelf (books, videos, off-screen activities)** is static product content shipped
  with the app (`apps/web/src/data/library.ts`), carrying its titles in all three languages
  inline. There is no backend model for it; changing it is a code change by design.
- **Game engines and their question banks, achievement and reward definitions** are code and
  seed-managed. The admin console shows them honestly as read-only (live unlock/claim/play data,
  no fake editors); adding an editor would require new write endpoints and validation models that
  are out of scope for this phase.

System notifications store a `messageKey` + params and render in each recipient's locale at read
time (`apps/api/src/notifications/notification-messages.ts`); custom admin announcements are
stored verbatim. `pnpm --filter @kidslearn/api audit:translations` verifies that every piece of
educational content has real uz/ru/en translations — not English fallbacks.

---

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml): install → generate → lint → typecheck →
unit tests, then integration tests against real Postgres and Redis services, a schema-drift check,
a production build, and both Docker images.

---

## Accessibility

Semantic HTML, labelled controls, a visible focus ring, keyboard-navigable tabs, menus, dialogs
and tables, focus trapping and restoration in overlays, `aria-live` for lesson and game feedback,
and charts that carry their data as text. State is never colour alone — a wrong answer changes
icon and wording too. `prefers-reduced-motion` removes confetti, floating and transitions
globally.

---

## Tech

Next.js 16 · React 19 · TypeScript strict · Tailwind CSS v4 · TanStack Query · React Hook Form ·
Zod · NestJS 11 · Prisma 6 · PostgreSQL 16 · Redis · BullMQ · MinIO · Argon2 · Swagger · Vitest ·
Playwright · Docker
