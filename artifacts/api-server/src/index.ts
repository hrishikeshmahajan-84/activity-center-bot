import { execFileSync } from "child_process";
import app from "./app";
import { logger } from "./lib/logger";
import { startScheduler } from "./lib/scheduler";
import { sendStartupPing } from "./lib/sms";

// ── Playwright browser installation ───────────────────────────────────────────
// Ensure the Chromium browser binary is present before the first scrape request
// arrives. This runs synchronously so the server only starts listening once the
// browser is ready. It is idempotent — playwright skips the download when the
// binary is already cached, so subsequent restarts are fast (~1 s).
//
// We set PLAYWRIGHT_BROWSERS_PATH here (before session.ts is ever imported) so
// both the install CLI and the Playwright Node API agree on the directory.
const PLAYWRIGHT_BROWSERS_PATH =
  process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/home/runner/.playwright-browsers";
process.env.PLAYWRIGHT_BROWSERS_PATH = PLAYWRIGHT_BROWSERS_PATH;

(function ensurePlaywrightBrowser() {
  // Prefer the locally-installed playwright binary (pnpm workspace root).
  const candidates = ["./node_modules/.bin/playwright", "playwright"];
  for (const bin of candidates) {
    try {
      execFileSync(bin, ["install", "chromium"], {
        env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH },
        stdio: "pipe",
        timeout: 180_000, // 3 min max; binary is ~100 MB on first run
      });
      logger.info({ PLAYWRIGHT_BROWSERS_PATH }, "Playwright Chromium ready");
      return;
    } catch (err) {
      // Log at debug level – NixOS dev env always fails here, that's expected.
      logger.debug(
        { bin, err: err instanceof Error ? err.message.slice(0, 120) : String(err) },
        "playwright install attempt failed (trying next candidate)"
      );
    }
  }
  logger.warn(
    "Could not install Playwright Chromium – scraper will be unavailable"
  );
})();

// ── Server ────────────────────────────────────────────────────────────────────

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
