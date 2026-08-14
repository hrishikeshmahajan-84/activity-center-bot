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

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { logger } from "../logger";

// Point Playwright to the persistent browser installation.
// Falls back to system Chromium (installed via nix-env) if the env var is not set.
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = "/home/runner/.playwright-browsers";
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

async function launchBrowser(): Promise<Browser> {
  if (browser?.isConnected()) return browser;

  logger.info("Launching Playwright Chromium browser");

  // Prefer the Playwright-managed headless shell (PLAYWRIGHT_BROWSERS_PATH is set at
  // module load time to /home/runner/.playwright-browsers). Only fall back to the Nix
  // system Chromium if the managed binary is missing or fails to start.
  try {
    browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
    logger.info("Launched Playwright-managed Chromium");
  } catch (managedErr) {
    const nixPath =
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
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

    // Look for any sign-in link that only appears when logged out.
    const signInLinks = await p
      .locator('a[href*="signin"], a[href*="login"], button:has-text("Sign in")')
      .count();
    return signInLinks === 0;
  } catch {
    return false;
  }
}

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

  // Fill email – try multiple selector strategies
  const emailInput = p.locator(
    'input[type="email"], input[name="email"], input[id*="email" i], input[placeholder*="email" i]'
  ).first();
  await emailInput.waitFor({ timeout: 10_000 });
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
