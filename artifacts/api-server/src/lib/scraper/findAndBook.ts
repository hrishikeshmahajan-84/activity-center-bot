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
import { SITE_URL, MEMBER_ID, getAuthenticatedPage, releaseBrowserLock, credentialsConfigured } from "./session";
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
  /** Day of week the class runs, e.g. "Wednesday". Used to pick the right session. */
  classDay?: string | null;
  /** Time the class runs, e.g. "6:00 PM". Used to pick the right session. */
  classTime?: string | null;
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

/** Look through search results for a card/row matching the target level (and optionally day/time). */
async function findMatchingActivity(
  page: Page,
  level: string,
  classDay?: string | null,
  classTime?: string | null,
): Promise<{ card: import("playwright").Locator; sessionDetails: { date: string | null; time: string | null } } | null> {
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

  const hasSessionHint = !!(classDay || classTime);

  for (const sel of resultSelectors) {
    const cards = await page.locator(sel).all();
    if (cards.length === 0) continue;

    const levelLower = level.toLowerCase();
    const dayLower = classDay?.toLowerCase() ?? null;
    // Accept abbreviated day names: "Wednesday" matches "wed", "Wednesday", etc.
    const dayAbbr = dayLower ? dayLower.slice(0, 3) : null;
    const timeLower = classTime?.toLowerCase() ?? null;

    // Collect all cards whose text contains the level, then score them.
    type Candidate = { card: import("playwright").Locator; score: number; text: string };
    const candidates: Candidate[] = [];

    for (const card of cards) {
      const text = ((await card.textContent().catch(() => "")) ?? "").toLowerCase();
      if (!text.includes(levelLower)) continue;

      let score = 0;
      if (dayLower && (text.includes(dayLower) || (dayAbbr && text.includes(dayAbbr)))) score += 2;
      if (timeLower && text.includes(timeLower)) score += 2;

      candidates.push({ card, score, text });
    }

    if (candidates.length === 0) continue;

    // Sort by score descending — highest match wins.
    candidates.sort((a, b) => b.score - a.score);

    const best = candidates[0]!;

    if (hasSessionHint && best.score === 0) {
      // We have hints but nothing matched them — warn but still use the top card
      // so the bot doesn't silently give up. The Telegram confirmation will show
      // the actual class details so the user can catch a wrong pick.
      logger.warn(
        { level, classDay, classTime, selector: sel },
        "Session hints (day/time) not found in any card text — booking top result; verify confirmation"
      );
    } else if (hasSessionHint) {
      logger.info(
        { level, classDay, classTime, score: best.score, selector: sel },
        "Found best-matching activity card"
      );
    } else {
      logger.info({ level, selector: sel }, "Found matching activity card (no session hint)");
    }

    const dateText = await best.card.locator(".date, .dates, .date-range, .activity-date").first().textContent().catch(() => null);
    const timeText = await best.card.locator(".time, .times, .activity-time").first().textContent().catch(() => null);

    return {
      card: best.card,
      sessionDetails: {
        date: dateText?.trim() ?? null,
        time: timeText?.trim() ?? null,
      },
    };
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

/**
 * After clicking Register, Active Network often shows a family-member picker
 * before adding to cart. This function detects that step and selects Agastya.
 *
 * Strategy (in priority order):
 *   1. Any checkbox/radio whose associated label contains "Agastya"
 *   2. Any element with a data attribute matching BURNABY_MEMBER_ID
 *   3. Any label/row whose text contains "Agastya" – click to toggle
 *
 * If no participant picker appears within 4 seconds the site auto-selected
 * the participant (or skipped the step) and we proceed normally.
 *
 * After selecting, looks for an "Add to Cart" / "Continue" / "Next" button
 * on the picker modal/page and clicks it.
 */
async function selectParticipant(page: Page): Promise<void> {
  // Give the page time to render the participant picker (if any)
  await page.waitForTimeout(2_000);

  // ── Detect whether a participant picker is visible ────────────────────────
  // Active Network renders participant pickers as a modal overlay or an inline
  // section.  We look for any of the known container selectors.
  const pickerSelectors = [
    ".participant-selection",
    ".family-member-selection",
    "[class*='participant' i]",
    "[class*='family-member' i]",
    "[data-testid*='participant' i]",
    // Generic: a section with multiple checkboxes that appeared after the click
    "form:has(input[type='checkbox'] + label), form:has(input[type='radio'] + label)",
  ];

  let pickerVisible = false;
  for (const sel of pickerSelectors) {
    if (await page.locator(sel).first().isVisible({ timeout: 1_000 }).catch(() => false)) {
      pickerVisible = true;
      logger.info({ selector: sel }, "Participant picker detected");
      break;
    }
  }

  if (!pickerVisible) {
    // No picker – site auto-selected or skipped the step
    logger.info("No participant picker detected – assuming auto-selection");
    return;
  }

  // ── Try to select Agastya ─────────────────────────────────────────────────

  // 1. Checkbox/radio whose label text contains "Agastya"
  const byName = page.locator(
    'label:has-text("Agastya"), input[type="checkbox"] + label:has-text("Agastya"), input[type="radio"] + label:has-text("Agastya")'
  ).first();

  if (await byName.isVisible().catch(() => false)) {
    // If it's a label, click it to toggle the associated input
    await byName.click();
    logger.info("Selected participant via name label ('Agastya')");
  } else {
    // 2. Element with a data attribute matching the member ID
    const memberId = MEMBER_ID;
    const byId = page.locator(
      `[data-customer-id="${memberId}"], [data-member-id="${memberId}"], [data-participant-id="${memberId}"], [value="${memberId}"]`
    ).first();

    if (await byId.isVisible().catch(() => false)) {
      await byId.click();
      logger.info({ memberId }, "Selected participant via member ID attribute");
    } else {
      // 3. Any row/cell containing "Agastya" – click it
      const byText = page.locator('td:has-text("Agastya"), li:has-text("Agastya"), div:has-text("Agastya")').first();
      if (await byText.isVisible().catch(() => false)) {
        await byText.click();
        logger.info("Selected participant via text row ('Agastya')");
      } else {
        // Could not find Agastya – log a warning and continue; the booking
        // will likely fail at checkout but we'll capture that as scraper_error.
        logger.warn(
          { memberId },
          "Participant picker visible but could not locate Agastya – proceeding without selection"
        );
        return;
      }
    }
  }

  await page.waitForTimeout(800);

  // ── Click the "Add to Cart" / "Continue" / "Next" button on the picker ────
  const pickerConfirmBtn = page.locator(
    [
      'button:has-text("Add to Cart")',
      'button:has-text("Continue")',
      'button:has-text("Next")',
      'a:has-text("Add to Cart")',
      'a:has-text("Continue")',
      'input[type="submit"]',
    ].join(", ")
  ).first();

  if (await pickerConfirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await pickerConfirmBtn.click();
    await page.waitForTimeout(1_500);
    logger.info("Clicked participant picker confirm button");
  } else {
    logger.warn("Could not find confirm button on participant picker – proceeding anyway");
  }
}

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
  const { activityName, level, classDay, classTime, dryRun } = target;

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
    const match = await findMatchingActivity(page, level, classDay, classTime);
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
    await selectParticipant(page); // pick Agastya if site shows a family-member step
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
