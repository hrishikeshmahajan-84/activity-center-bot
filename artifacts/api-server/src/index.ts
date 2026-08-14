import { execFileSync } from "child_process";

// ── Environment setup (MUST run before any module that imports playwright) ───
// Playwright computes its browser registry directory ONCE at module-import
// time. ESM static imports are hoisted, so if we statically imported ./app
// here, playwright would load before this assignment and ignore it. That is
// exactly why the deployed server (started with plain `node dist/index.mjs`,
// no shell exports) looked in the default ~/.cache/ms-playwright path.
// Everything below therefore uses dynamic import AFTER the env var is set.
const PLAYWRIGHT_BROWSERS_PATH =
  process.env.PLAYWRIGHT_BROWSERS_PATH ??
  "/home/runner/workspace/.playwright-browsers";
process.env.PLAYWRIGHT_BROWSERS_PATH = PLAYWRIGHT_BROWSERS_PATH;

// ── Playwright browser installation ──────────────────────────────────────────
// Idempotent: playwright skips the download when the binary is already cached.
// pnpm does NOT hoist .bin to the workspace root — cover both possible CWDs
// (deployment runs from the workspace root, dev from artifacts/api-server).
function ensurePlaywrightBrowser(): boolean {
  const candidates = [
    "/home/runner/workspace/artifacts/api-server/node_modules/.bin/playwright",
    "artifacts/api-server/node_modules/.bin/playwright",
    "node_modules/.bin/playwright",
    "playwright",
  ];
  for (const bin of candidates) {
    try {
      execFileSync(bin, ["install", "chromium"], {
        env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH },
        stdio: "pipe",
        timeout: 180_000, // 3 min max; binary is ~100 MB on first run
      });
      return true;
    } catch {
      // try next candidate; NixOS dev failures here are expected
    }
  }
  return false;
}

const browserReady = ensurePlaywrightBrowser();

// ── Server (dynamically imported so playwright sees the env var above) ───────

async function main() {
  const [{ default: app }, { logger }, { startScheduler }, { sendStartupPing }] =
    await Promise.all([
      import("./app"),
      import("./lib/logger"),
      import("./lib/scheduler"),
      import("./lib/sms"),
    ]);

  if (browserReady) {
    logger.info({ PLAYWRIGHT_BROWSERS_PATH }, "Playwright Chromium ready");
  } else {
    logger.warn(
      "Could not install Playwright Chromium – scraper will be unavailable"
    );
  }

  const rawPort = process.env["PORT"];

  if (!rawPort) {
    throw new Error(
      "PORT environment variable is required but was not provided.",
    );
  }

  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");

    // Start the booking scheduler (no-op outside registration windows)
    startScheduler();

    // Optional startup SMS in dev to confirm Twilio is wired correctly
    sendStartupPing().catch((e) =>
      logger.warn({ err: e }, "Startup SMS ping failed")
    );
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
