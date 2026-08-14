/**
 * Playwright browser session manager.
 *
 * Manages a singleton Chromium browser and an authenticated page context.
 * Call getAuthenticatedPage() to get a page that is already logged in to the
 * Burnaby Active Communities site. The session is reused across calls; if the
 * session has expired or the browser has crashed, a fresh login is performed.
 *
 * Requires env vars:
 *   BURNABY_USERNAME  – account email
 *   BURNABY_PASSWORD  – account password
 *   BURNABY_MEMBER_ID – family member ID in the schedule URL (default "339047")
 *   BURNABY_SITE_URL  – base URL (default "https://anc.ca.apm.activecommunities.com/burnaby")
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { logger } from "../logger";

// Point Playwright to the persistent browser installation.
// Falls back to system Chromium (installed via nix-env) if the env var is not set.
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH =
    "/home/runner/workspace/.playwright-browsers";
}

export const SITE_URL =
  process.env.BURNABY_SITE_URL ??
  "https://anc.ca.apm.activecommunities.com/burnaby";

export const MEMBER_ID = process.env.BURNABY_MEMBER_ID ?? "339047";

// Singleton state – lives for the lifetime of the API server process.
let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;
let sessionLocked = false;

/** Acquire a simple in-process lock so concurrent requests don't stomp each other. */
async function acquireLock(timeoutMs = 60_000): Promise<void> {
  const start = Date.now();
  while (sessionLocked) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Scraper session lock timed out – another request is already running");
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  sessionLocked = true;
}

function releaseLock(): void {
  sessionLocked = false;
}

const LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-blink-features=AutomationControlled",
];

/**
 * Locate the Chromium binary installed at build time inside the workspace.
 * We resolve the executable path ourselves instead of relying on Playwright's
 * registry, because Playwright snapshots PLAYWRIGHT_BROWSERS_PATH at module
 * load time — before our code can set it when the server is started with a
 * plain `node dist/index.mjs` (as the deployed container does).
 */
function findManagedChromium(): string | null {
  const root =
    process.env.PLAYWRIGHT_BROWSERS_PATH ??
    "/home/runner/workspace/.playwright-browsers";
  try {
    for (const dir of fs.readdirSync(root)) {
      if (!dir.startsWith("chromium")) continue;
      const candidates = [
        path.join(root, dir, "chrome-headless-shell-linux64", "chrome-headless-shell"),
        path.join(root, dir, "chrome-linux", "chrome"),
      ];
      for (const exe of candidates) {
        if (fs.existsSync(exe)) return exe;
      }
    }
  } catch {
    // directory missing – fall through
  }
  return null;
}

/** Resolve the Nix-installed chromium from PATH (self-contained, works in dev and deploy). */
function findNixChromium(): string | null {
  try {
    const p = execSync("which chromium || which chromium-browser", { encoding: "utf8" }).trim();
    return p || null;
  } catch {
    return null;
  }
}

async function launchBrowser(): Promise<Browser> {
  if (browser?.isConnected()) return browser;

  logger.info("Launching Playwright Chromium browser");

  // Prefer the workspace-bundled Chromium (installed at build time), resolved
  // explicitly by path. Only fall back to Nix system Chromium if missing.
  try {
    const managedPath = findManagedChromium();
    browser = await chromium.launch({
      headless: true,
      args: LAUNCH_ARGS,
      ...(managedPath ? { executablePath: managedPath } : {}),
    });
    logger.info({ executablePath: managedPath ?? "(registry default)" }, "Launched Playwright-managed Chromium");
  } catch (managedErr) {
    const nixPath =
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
      findNixChromium() ??
      "/home/runner/.nix-profile/bin/chromium";
    logger.warn(
      { err: managedErr instanceof Error ? managedErr.message : String(managedErr), fallback: nixPath },
      "Playwright-managed Chromium unavailable – falling back to Nix chromium"
    );
    browser = await chromium.launch({
      headless: true,
      executablePath: nixPath,
      args: LAUNCH_ARGS,
    });
    logger.info({ executablePath: nixPath }, "Launched Nix Chromium as fallback");
  }

  browser.on("disconnected", () => {
    logger.warn("Browser disconnected – will relaunch on next request");
    browser = null;
    context = null;
    page = null;
  });
  return browser;
}

async function createContext(b: Browser): Promise<BrowserContext> {
  const ctx = await b.newContext({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
    locale: "en-CA",
    timezoneId: "America/Vancouver",
  });
  return ctx;
}

/** Returns true if the current page appears to be authenticated. */
async function isAuthenticated(p: Page): Promise<boolean> {
  try {
    const url = p.url();

    // New pages, blank pages, or non-HTTP pages are never authenticated.
    if (!url || url === "about:blank" || !url.startsWith("http")) return false;

    // Login/sign-in pages mean we're not authenticated.
    if (url.includes("/signin") || url.includes("/login")) return false;

    // Must be on the correct site, not some redirect to an error page.
    if (!url.includes("activecommunities.com") && !url.includes("apm.")) return false;

    // Ask the site itself: this lightweight REST endpoint returns code "0000"
    // only for an authenticated session. Far more reliable than probing the
    // DOM for sign-in links (which can appear in menus even when logged in).
    const code = await p.evaluate(async (siteUrl: string) => {
      const r = await fetch(`${siteUrl}/rest/myaccount/familyschedules/filters?locale=en-US`, {
        credentials: "include",
        signal: AbortSignal.timeout(10_000),
      });
      const j = (await r.json()) as { headers?: { response_code?: string } };
      return j.headers?.response_code ?? null;
    }, SITE_URL);
    return code === "0000";
  } catch {
    return false;
  }
}

// hint: Logic changed on both sides. Requires understanding intent of each change.
async function login(p: Page): Promise<void> {
  const username = process.env.BURNABY_USERNAME;
  const password = process.env.BURNABY_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "BURNABY_USERNAME and BURNABY_PASSWORD environment variables must be set. " +
        "Add them as secrets in the Replit workspace."
    );
  }

  logger.info({ url: `${SITE_URL}/signin` }, "Navigating to login page");
  await p.goto(`${SITE_URL}/signin`, { waitUntil: "networkidle", timeout: 30_000 });

  // If the session cookie is still valid, the signin page redirects straight
  // back to the account area — we're already logged in. Verify the destination
  // actually looks authenticated rather than trusting any non-signin URL.
  if (!p.url().includes("/signin") && !p.url().includes("/login")) {
    if (await isAuthenticated(p)) {
      logger.info({ url: p.url() }, "Already logged in – signin redirected to account");
      return;
    }
    throw new Error(`Login page redirected to unexpected unauthenticated URL: ${p.url()}`);
  }

  // Fill email – try multiple selector strategies
  const emailInput = p.locator(
    'input[type="email"], input[name="email"], input[id*="email" i], input[placeholder*="email" i]'
  ).first();
  try {
    await emailInput.waitFor({ timeout: 10_000 });
  } catch (err) {
    // Late redirect race: field never appeared because we got bounced to the
    // account page after the initial URL check.
    if (!p.url().includes("/signin") && !p.url().includes("/login") && (await isAuthenticated(p))) {
      logger.info({ url: p.url() }, "Already logged in – signin redirected during wait");
      return;
    }
    throw err;
  }
  await emailInput.fill(username);

  // Fill password
  const passwordInput = p.locator('input[type="password"]').first();
  await passwordInput.fill(password);

  // A small human-like delay
  await p.waitForTimeout(300 + Math.random() * 400);

  // Click submit
  const submitBtn = p.locator(
    'button[type="submit"], input[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")'
  ).first();
  await submitBtn.click();

  // Wait for redirect away from signin page
  try {
    await p.waitForURL((url) => !url.href.includes("/signin") && !url.href.includes("/login"), {
      timeout: 20_000,
    });
  } catch {
    // Check if there's an error message on the page
    const errMsg = await p.locator('.error, .alert-danger, [class*="error" i]').first().textContent().catch(() => null);
    throw new Error(`Login failed: ${errMsg ?? "redirected back to login page – check credentials"}`);
  }

  logger.info({ url: p.url() }, "Login successful");
}

/**
 * Returns an authenticated Playwright page, reusing the existing session if
 * still valid, or performing a fresh login otherwise.
 *
 * Callers MUST call `releaseBrowserLock()` after they are done with the page.
 */
export async function getAuthenticatedPage(): Promise<Page> {
  await acquireLock();

  try {
    const b = await launchBrowser();

    if (!context) context = await createContext(b);
    if (!page || page.isClosed()) page = await context.newPage();

    if (!(await isAuthenticated(page))) {
      logger.info("Session not authenticated – logging in");
      await login(page);
    }

    return page;
  } catch (err) {
    releaseLock();
    throw err;
  }
}

/** MUST be called after getAuthenticatedPage() to release the lock. */
export function releaseBrowserLock(): void {
  releaseLock();
}

/** Tear down the browser entirely (called on server shutdown or test cleanup). */
export async function closeBrowser(): Promise<void> {
  await browser?.close().catch(() => null);
  browser = null;
  context = null;
  page = null;
}

/** Check if credentials are configured. */
export function credentialsConfigured(): boolean {
  return Boolean(process.env.BURNABY_USERNAME && process.env.BURNABY_PASSWORD);
}
