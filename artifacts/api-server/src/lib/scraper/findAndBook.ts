/**
 * Finds a target activity on the Burnaby Active Communities site, checks if
 * registration is open, and (unless dryRun=true) completes the full checkout.
 *
 * Outcomes:
 *   success            – booked successfully, confirmationNumber populated
 *   no_spot            – registration open but session full (waitlist only)
 *   registration_not_open – found the activity but registration hasn't started
 *   failed             – activity not found or checkout failed partway through
 *   scraper_error      – unhandled exception during scraping
 *   not_configured     – missing BURNABY_USERNAME / BURNABY_PASSWORD env vars
 */

import { logger } from "../logger";
import { SITE_URL, getAuthenticatedPage, releaseBrowserLock, credentialsConfigured } from "./session";
import type { Page } from "playwright";

export type BookingOutcome =
  | "success"
  | "no_spot"
  | "registration_not_open"
  | "failed"
  | "scraper_error"
  | "not_configured";

export interface FindAndBookResult {
  outcome: BookingOutcome;
  message: string;
  confirmationNumber: string | null;
  classDate: string | null;
  classTime: string | null;
  dryRun: boolean;
}

interface BookTarget {
  activityName: string; // e.g. "Swimming"
  level: string;        // e.g. "Orca"
  dryRun: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Search term for the activity catalog. Maps common names to search keywords. */
function buildSearchKeyword(activityName: string, level: string): string {
  const name = activityName.toLowerCase();
  if (name.includes("swim")) return `swimming ${level}`;
  if (name.includes("skat")) return `skating ${level}`;
  return `${activityName} ${level}`;
}

/** Wait for a locator to be visible, returning false (not throwing) if it times out. */
async function isVisible(page: Page, selector: string, timeoutMs = 5_000): Promise<boolean> {
  try {
    await page.locator(selector).first().waitFor({ state: "visible", timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

// ─── Find the activity ───────────────────────────────────────────────────────

async function searchForActivity(page: Page, activityName: string, level: string): Promise<boolean> {
  const keyword = buildSearchKeyword(activityName, level);
  const searchUrl = `${SITE_URL}/activity/search?query=${encodeURIComponent(keyword)}`;

  logger.info({ url: searchUrl }, "Navigating to activity search");
  await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForTimeout(2_000); // let React render

  // Also try the keyword search box if it exists on the page
  const searchBox = page.locator('input[type="search"], input[placeholder*="search" i], input[name*="search" i]').first();
  if (await searchBox.isVisible().catch(() => false)) {
    await searchBox.fill(keyword);
    await searchBox.press("Enter");
    await page.waitForTimeout(2_000);
  }

  return true;
}

/** Look through search results for a card/row matching the target level. */
async function findMatchingActivity(page: Page, level: string): Promise<{ card: import("playwright").Locator; sessionDetails: { date: string | null; time: string | null } } | null> {
  // Possible result containers on Active Network platform
  const resultSelectors = [
    ".activity-result",
    ".activity-card",
    ".course-card",
    ".search-result-item",
    ".activity-listing",
    "article",
    "[data-testid*='activity']",
  ];

  for (const sel of resultSelectors) {
    const cards = await page.locator(sel).all();
    if (cards.length === 0) continue;

    for (const card of cards) {
      const text = (await card.textContent().catch(() => "")) ?? "";
      if (text.toLowerCase().includes(level.toLowerCase())) {
        const dateText = await card.locator(".date, .dates, .date-range, .activity-date").first().textContent().catch(() => null);
        const timeText = await card.locator(".time, .times, .activity-time").first().textContent().catch(() => null);
        logger.info({ level, selector: sel }, "Found matching activity card");
        return {
          card,
          sessionDetails: {
            date: dateText?.trim() ?? null,
            time: timeText?.trim() ?? null,
          },
        };
      }
    }
  }

  return null;
}

/** Check for a register/add-to-cart button on the card and return its state. */
async function getRegisterButtonState(card: import("playwright").Locator): Promise<"open" | "full" | "not_open" | "none"> {
  // Buttons indicating registration IS open
  const openBtn = card.locator(
    'button:has-text("Register"), button:has-text("Add to Cart"), button:has-text("Enroll"), a:has-text("Register"), a:has-text("Add to Cart")'
  ).first();

  if (await openBtn.isVisible().catch(() => false)) {
    const disabled = await openBtn.isDisabled().catch(() => false);
    if (!disabled) return "open";
  }

  // Buttons indicating waitlist / full
  const waitlistBtn = card.locator('button:has-text("Waitlist"), button:has-text("Wait List"), button:has-text("Full")').first();
  if (await waitlistBtn.isVisible().catch(() => false)) return "full";

  // Text indicating not yet open
  const text = ((await card.textContent().catch(() => "")) ?? "").toLowerCase();
  if (text.includes("registration opens") || text.includes("opens on") || text.includes("not yet open")) {
    return "not_open";
  }

  return "none";
}

// ─── Checkout flow ───────────────────────────────────────────────────────────

async function clickRegisterButton(card: import("playwright").Locator, page: Page): Promise<void> {
  const registerBtn = card.locator(
    'button:has-text("Register"), button:has-text("Add to Cart"), button:has-text("Enroll"), a:has-text("Register"), a:has-text("Add to Cart")'
  ).first();

  await registerBtn.click();
  await page.waitForTimeout(1_500);
}

async function proceedThroughCart(page: Page): Promise<void> {
  // Navigate to cart if we're not already there
  if (!page.url().includes("/cart")) {
    const cartLink = page.locator('a[href*="/cart"], button:has-text("View Cart"), a:has-text("Cart")').first();
    if (await cartLink.isVisible().catch(() => false)) {
      await cartLink.click();
      await page.waitForTimeout(1_500);
    }
  }

  // Click checkout / proceed
  const checkoutBtn = page.locator(
    'button:has-text("Proceed to Checkout"), button:has-text("Checkout"), a:has-text("Proceed to Checkout"), a:has-text("Checkout")'
  ).first();

  if (await checkoutBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await checkoutBtn.click();
    await page.waitForTimeout(2_000);
  } else {
    throw new Error("Could not find Checkout button in cart");
  }
}

async function confirmPayment(page: Page, dryRun: boolean): Promise<string | null> {
  // Wait for payment/confirmation page
  await page.waitForTimeout(2_000);

  if (dryRun) {
    logger.info("DRY RUN: stopping before final payment confirmation");
    return null;
  }

  // Look for the final "Confirm" / "Submit Order" / "Complete Registration" button
  const confirmBtn = page.locator(
    [
      'button:has-text("Confirm")',
      'button:has-text("Submit Order")',
      'button:has-text("Complete Registration")',
      'button:has-text("Place Order")',
      'button:has-text("Pay Now")',
      'input[type="submit"]',
    ].join(", ")
  ).first();

  if (!(await confirmBtn.isVisible({ timeout: 10_000 }).catch(() => false))) {
    throw new Error("Could not find final Confirm button on payment page");
  }

  await confirmBtn.click();
  await page.waitForTimeout(3_000);

  // Extract confirmation / order number from the confirmation page
  const confirmationText = await page
    .locator(
      [
        ".confirmation-number",
        ".order-number",
        "[class*='confirmation' i]",
        "[class*='order-number' i]",
        "strong:has-text('Confirmation')",
        "p:has-text('Order #')",
        "p:has-text('Confirmation #')",
      ].join(", ")
    )
    .first()
    .textContent()
    .catch(() => null);

  // Try to extract just the number
  if (confirmationText) {
    const match = confirmationText.match(/[#\s](\d+)/);
    return match ? match[1] : confirmationText.trim();
  }

  // Fallback: scan page body for confirmation number pattern
  const bodyText = await page.locator("body").innerText().catch(() => "");
  const bodyMatch = bodyText.match(/(?:confirmation|order)\s*(?:#|number|no\.?)\s*:?\s*([A-Z0-9-]{4,})/i);
  return bodyMatch ? bodyMatch[1] : null;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function findAndBook(target: BookTarget): Promise<FindAndBookResult> {
  const { activityName, level, dryRun } = target;

  if (!credentialsConfigured()) {
    return {
      outcome: "not_configured",
      message:
        "Scraper not configured: BURNABY_USERNAME and BURNABY_PASSWORD environment variables must be set as Replit secrets.",
      confirmationNumber: null,
      classDate: null,
      classTime: null,
      dryRun,
    };
  }

  // Acquire session inside the error boundary so auth/browser failures are
  // captured as scraper_error results rather than thrown to Express.
  let page: Page;
  try {
    page = await getAuthenticatedPage();
  } catch (authErr) {
    // getAuthenticatedPage already released the lock on failure.
    const message = authErr instanceof Error ? authErr.message : String(authErr);
    logger.error({ err: message }, "Failed to acquire authenticated page");
    return {
      outcome: "scraper_error",
      message: `Authentication/browser failure: ${message}`,
      confirmationNumber: null,
      classDate: null,
      classTime: null,
      dryRun,
    };
  }

  try {
    // 1. Search for the activity
    await searchForActivity(page, activityName, level);

    // 2. Find a matching card in results
    const match = await findMatchingActivity(page, level);
    if (!match) {
      return {
        outcome: "failed",
        message: `Activity "${activityName} – ${level}" not found in search results. The activity may have a different name on the site, or search selectors need adjusting.`,
        confirmationNumber: null,
        classDate: null,
        classTime: null,
        dryRun,
      };
    }

    // 3. Check register button state
    const state = await getRegisterButtonState(match.card);
    logger.info({ activityName, level, state }, "Register button state");

    if (state === "not_open") {
      return {
        outcome: "registration_not_open",
        message: `Found "${activityName} – ${level}" but registration has not opened yet.`,
        confirmationNumber: null,
        classDate: match.sessionDetails.date,
        classTime: match.sessionDetails.time,
        dryRun,
      };
    }

    if (state === "full") {
      return {
        outcome: "no_spot",
        message: `"${activityName} – ${level}" is full or waitlist only.`,
        confirmationNumber: null,
        classDate: match.sessionDetails.date,
        classTime: match.sessionDetails.time,
        dryRun,
      };
    }

    if (state === "none") {
      return {
        outcome: "failed",
        message: `Found "${activityName} – ${level}" but could not determine registration state (no Register button or status text found).`,
        confirmationNumber: null,
        classDate: match.sessionDetails.date,
        classTime: match.sessionDetails.time,
        dryRun,
      };
    }

    // 4. Registration is OPEN – proceed with booking
    logger.info({ activityName, level, dryRun }, "Registration open – starting checkout");
    await clickRegisterButton(match.card, page);
    await proceedThroughCart(page);
    const confirmationNumber = await confirmPayment(page, dryRun);

    if (dryRun) {
      return {
        outcome: "success",
        message: `DRY RUN: would have booked "${activityName} – ${level}". Full flow ran successfully up to payment confirmation.`,
        confirmationNumber: null,
        classDate: match.sessionDetails.date,
        classTime: match.sessionDetails.time,
        dryRun,
      };
    }

    return {
      outcome: "success",
      message: `Successfully booked "${activityName} – ${level}". Confirmation: ${confirmationNumber ?? "see account page"}`,
      confirmationNumber,
      classDate: match.sessionDetails.date,
      classTime: match.sessionDetails.time,
      dryRun,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message, activityName, level }, "Scraper error during findAndBook");
    return {
      outcome: "scraper_error",
      message,
      confirmationNumber: null,
      classDate: null,
      classTime: null,
      dryRun,
    };
  } finally {
    releaseBrowserLock();
  }
}
