# Burnaby Activities

Personal automation dashboard for registering a 5-year-old for Orca swimming and Gliders 2 ice skating at Burnaby Active Communities. Monitors registration windows (9–11am PT) and auto-books spots the moment they open.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/burnaby-app run dev` — run the dashboard frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (pre-configured by Replit)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 at `/api`
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (v3), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- Frontend: React 19 + Vite + Tailwind CSS v4 + TanStack Query
- Build: esbuild (CJS bundle for API server)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/activityTargets.ts` — activity_targets table
- `lib/db/src/schema/bookingLog.ts` — booking_log table
- `artifacts/api-server/src/routes/` — Express route handlers (targets, bookings, registrations, scheduler)
- `artifacts/burnaby-app/src/` — React frontend (dashboard, targets, bookings, settings pages)
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — generated Zod schemas for API server (do not edit)

## Architecture decisions

- **Integer types as `number` in OpenAPI spec** — Orval 8.23 generates `zod.int()` for `type: integer` which is zod v4-only syntax; workspace uses zod v3, so all integer IDs use `type: number` in the spec.
- **Stub endpoints for Task 2/3 work** — `/api/registrations/current`, `/api/registrations/scrape`, `/api/scheduler/trigger` return stubs; real Playwright scraper and scheduler are wired in Tasks 2 and 3.
- **Registration dates stored as `date` (string mode)** — uses `YYYY-MM-DD` strings to avoid timezone-shift issues with calendar days.

## Product

- **Dashboard** (`/`) — command centre showing current registrations, active targets with scheduler status, and recent booking log
- **Targets** (`/targets`) — manage activity targets (add Orca swimming, Gliders 2 skating) with registration dates and check windows
- **Bookings** (`/bookings`) — full auto-booking attempt history with outcome badges
- **Settings** (`/settings`) — credential and Twilio SMS configuration guide

## User preferences

- Orca level for swimming; Gliders 2 for ice skating
- Registration windows: 9:00am–11:00am America/Vancouver
- Fully automatic booking (no confirmation prompt)
- SMS notifications via Twilio to configured phone number
- Run scheduler on registration day only, not continuously

## Gotchas

- After any `lib/api-spec/openapi.yaml` change, always run `pnpm --filter @workspace/api-spec run codegen` before touching backend routes (Zod schema names are derived by Orval from operationIds).
- Do not use `type: integer` in the OpenAPI spec — use `type: number` to stay compatible with zod v3.
- The API server listens on port 8080 (set by the managed workflow); the frontend proxies through the shared reverse proxy at port 80.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
