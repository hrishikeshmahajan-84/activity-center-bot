# Activity Center Bot 🤖⛸️🏊

A personal automation tool that books City of Burnaby rec classes the moment registration opens — so Agastya never misses Gliders 2 or Orca swimming.

## Access the app

**Live app:** [active-communities-bot.replit.app](https://active-communities-bot.replit.app)

**Replit workspace:** [Join on Replit](https://replit.com/join#t=stkwxfarqpvddjk-hrishimahajan)

---

## What it does

The City of Burnaby opens registration for popular classes (swimming, ice skating) at a fixed time on a fixed date. Spots fill in seconds. This bot:

1. **Watches the clock** — wakes up 30 minutes before the registration window
2. **Sends a heads-up** — Telegram notification so you know it's about to run
3. **Polls the registration page** — checks every 60 seconds inside the window using a headless browser
4. **Books automatically** — completes the enrollment the moment the class becomes registerable
5. **Confirms via Telegram** — sends the booking confirmation (or an error if something went wrong)

## Architecture

```
pnpm monorepo
├── artifacts/api-server       — Express + Drizzle ORM + Playwright scraper
│   ├── src/lib/scheduler.ts   — in-process cron loop (60 s ticks)
│   ├── src/lib/scraper/       — Playwright browser automation (singleton page)
│   ├── src/lib/sms.ts         — Telegram (primary) + Twilio SMS (fallback)
│   └── src/routes/            — REST API consumed by the dashboard
├── artifacts/burnaby-app      — React + Vite dashboard (activity targets, booking history, scheduler status)
├── artifacts/burnaby-mobile   — Expo React Native companion app
├── artifacts/activity-center-deck — 9-slide presentation deck
├── lib/api-spec/openapi.yaml  — single source of truth for API contracts
├── lib/api-zod/               — Zod schemas generated from OpenAPI spec
└── lib/api-client-react/      — React Query hooks generated from OpenAPI spec
```

## Dashboard

The web dashboard at `/` lets you:

- See **current registrations** (scraped live from the Burnaby site)
- Configure **activity targets** (which class, which level, which registration date and time window)
- View **booking history** with outcomes per attempt
- Monitor **scheduler status** in real time
- See **upcoming classes** at Edmonds and Rosemary Brown Recreation Centre

## Notifications

| Channel | Role | Notes |
|---------|------|-------|
| Telegram | Primary | Free, instant. Bot sends to a private chat. |
| Twilio SMS | Fallback | Used if Telegram delivery fails. Trial tier limits templates. |

## Tech stack

| Layer | Tech |
|-------|------|
| Scraper | Playwright (headless Chromium) |
| Backend | Node.js · Express · Drizzle ORM · PostgreSQL |
| Frontend | React · Vite · TanStack Query · Tailwind CSS |
| Mobile | Expo (React Native) |
| API contract | OpenAPI 3.0 → orval codegen |
| Notifications | Telegram Bot API · Twilio |
| Hosting | Replit (API server needs **Reserved VM** — see below) |

## Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- A City of Burnaby account with a child registered
- A Telegram bot token ([@BotFather](https://t.me/BotFather))

### Environment secrets

Set these as Replit secrets (or `.env` locally):

```
BURNABY_USERNAME      # Burnaby account email
BURNABY_PASSWORD      # Burnaby account password
BURNABY_MEMBER_ID     # Member ID of the child to register
BURNABY_API_KEY       # Internal key for the check-and-book endpoint
SESSION_SECRET        # Express session secret (any random string)
TELEGRAM_BOT_TOKEN    # From @BotFather
TELEGRAM_CHAT_ID      # Chat ID to send notifications to
TWILIO_ACCOUNT_SID    # (optional) Twilio fallback
TWILIO_AUTH_TOKEN     # (optional)
TWILIO_FROM_NUMBER    # (optional)
NOTIFY_PHONE_NUMBER   # (optional) SMS recipient
```

### Running locally

```bash
pnpm install
pnpm run --filter @workspace/api-spec codegen   # regenerate types if spec changed
pnpm --filter @workspace/api-server run dev     # API on :8080
pnpm --filter @workspace/burnaby-app run dev    # Dashboard on :5173
```

## Deployment

> ⚠️ **Important:** deploy the API server as a **Reserved VM** (always-on), not Autoscale.
>
> The scheduler is an in-process background loop. Autoscale shuts the server down between visits — if no one opens the dashboard before 9:55 AM, the bot is asleep and misses the window entirely. This happened on the first live booking attempt (Aug 15, 2026). Reserved VM keeps the process alive 24/7.

The dashboard (`burnaby-app`) can stay on Autoscale — it's a stateless frontend.

## How the scheduler works

```
Every 60 seconds:
  For each active target:
    If today == registrationDate AND time is inside [checkWindowStart, checkWindowEnd]:
      → Try to book via Playwright scraper
      → On success: mark booked, send Telegram confirmation
      → On no_spot / not_open: keep retrying until window closes
      → On window close without booking: send Telegram alert
    Else if today == registrationDate AND time < checkWindowStart:
      → At (checkWindowStart - 30 min): send Telegram heads-up
    Else:
      → Skip (not registration day)
```

## Key lessons learned

1. **Ship the scraper first** — browser automation is the hardest part. Validate it end-to-end before building the scheduler or dashboard.
2. **Design for failure at every step** — return structured errors, never throw. The scheduler always knows what happened.
3. **Notifications are the product** — a silent success is a missed opportunity.
4. **Match deployment type to workload** — Autoscale is right for APIs and dashboards, wrong for bots. A scheduler inside an Autoscale process is not a scheduler; it's a wish.

## Project structure decisions

- **Singleton Playwright page** with an in-process lock — avoids spawning multiple browser instances and prevents concurrent booking attempts
- **OpenAPI-first** — the spec in `lib/api-spec/openapi.yaml` is the contract; frontend types and hooks are generated, never hand-written
- **Idempotent startup reconciliation** (`lib/dataCleanup.ts`) — corrects stale prod data on every boot without needing direct DB access in production
- **Claim-before-send** dedup for notifications — a conditional DB update claims the "send" slot before the message goes out, preventing duplicate alerts across restarts
