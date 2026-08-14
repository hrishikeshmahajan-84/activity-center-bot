---
name: Playwright Chromium on Replit
description: How to get Playwright's Chromium running in the Replit NixOS dev environment and in deployed containers.
---

**Rule:** Always ensure `PLAYWRIGHT_BROWSERS_PATH` is set to the same value for both `playwright install` and `chromium.launch()`. The correct place to enforce this is at server startup in `artifacts/api-server/src/index.ts` via `ensurePlaywrightBrowser()`.

**Why:** There are two failure modes:
1. *Dev (NixOS)*: Chromium binaries (whether Playwright-managed or Nix-packaged) cannot execute due to kernel seccomp restrictions and glibc library conflicts. This is a permanent environment limitation; the scraper gracefully returns an error.
2. *Deployed container*: `playwright install` must run at process startup to download the binary (~100 MB) into `/home/runner/.playwright-browsers/`. The artifact's production run command is `node --enable-source-maps artifacts/api-server/dist/index.mjs` — it bypasses `package.json` scripts entirely, so `playwright install` must be called from inside `index.ts` (using `execFileSync('./node_modules/.bin/playwright', ['install', 'chromium'])`).

**How to apply:**
- `artifacts/api-server/src/index.ts` contains `ensurePlaywrightBrowser()` which runs synchronously before `app.listen()`. Do not remove it.
- `PLAYWRIGHT_BROWSERS_PATH` is set to `/home/runner/.playwright-browsers` in `index.ts` before any scraper module loads. `session.ts` respects this and skips its own default assignment.
- The `package.json` `start` script also exports `PLAYWRIGHT_BROWSERS_PATH` before running `playwright install`, but this is only exercised in dev mode (deployed containers skip it).
- On first production startup, browser download adds ~30–60 s before `app.listen()` is called. Subsequent restarts are instant (idempotent check).
- The binary candidate list in `ensurePlaywrightBrowser()`: `['./node_modules/.bin/playwright', 'playwright']` — try local pnpm binary first, fall back to PATH.
