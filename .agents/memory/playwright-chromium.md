---
name: Playwright Chromium on Replit
description: How to get Playwright's Chromium running in the Replit NixOS environment.
---

**Rule:** Playwright can't use `--with-deps` (blocks apt/sudo). Install the headless shell separately, then set `PLAYWRIGHT_BROWSERS_PATH` before any `chromium.launch()` call.

**Why:** Replit blocks system package managers. The `--with-deps` flag tries to use apt and fails. `/tmp` is ephemeral; install to the home directory for persistence.

**How to apply:** If Chromium is missing after a Replit restart, re-run the install from the `artifacts/api-server` directory, pointing to the persistent home-directory path. As a fallback, the Nix-installed chromium (`nix-env -iA nixpkgs.chromium`) can be used via `executablePath` — prefer the Playwright-managed binary when both are available because it matches the Playwright API version.
