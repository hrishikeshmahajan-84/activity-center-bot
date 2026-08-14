---
name: Playwright Chromium on Replit
description: How to get Playwright's Chromium running in the Replit NixOS environment.
---

**Rule:** The dev Replit container (NixOS) cannot run the Playwright-managed headless shell binary OR the Nix-packaged Chromium (v92). Both fail with either glibc library conflicts or SIGSEGV. The deployed container uses a standard Linux environment where `playwright install chromium` works correctly.

**Why:** NixOS stores all system libraries in `/nix/store` at content-addressed paths, not at standard `/lib/x86_64-linux-gnu/`. The Playwright binary (compiled for glibc Linux) cannot find libraries like `libglib-2.0.so.0`. Attempts to fix via `LD_LIBRARY_PATH` cause a second problem: Nix-compiled secondary libraries link to Nix's own glibc, creating a conflict with the binary's original interpreter (GLIBC_PRIVATE version mismatch). `patchelf` also segfaults in this kernel environment. The Nix Chromium (v92) segfaults unconditionally due to kernel seccomp policy blocking required syscalls.

**How to apply:**
- In dev: the scraper will always fail with a browser error. This is expected; the API returns `{ source: "live", error: "...", registrations: [] }` and the UI shows "Couldn't load right now". Do not try to fix it in dev — it is an environment limitation.
- In deployment: `playwright install chromium` runs automatically as part of the `start` script before the server boots. The deployed Linux container has standard glibc paths and the browser launches successfully.
- `PLAYWRIGHT_BROWSERS_PATH` must be set (defaults to `/home/runner/.playwright-browsers`) so the binary persists across restarts in the deployed container.
- Never use `--with-deps` on Replit dev (blocks apt/sudo), but it's fine in the start script because it degrades gracefully (`|| playwright install chromium || true`).
