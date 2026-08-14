/**
 * Reads the current activity registrations for the configured family member
 * from the Burnaby Active Communities schedule page.
 *
 * Uses the authenticated Playwright session from session.ts.
 */

import type { Page } from "playwright";
import { logger } from "../logger";
import { SITE_URL, MEMBER_ID, getAuthenticatedPage, releaseBrowserLock } from "./session";

export interface ScrapedRegistration {
  name: string;
  level: string | null;
  dates: string | null;
  times: string | null;
  location: string | null;
  status: string | null;
}

export interface ReadRegistrationsResult {
  registrations: ScrapedRegistration[];
  scrapedAt: string;
  source: "live";
  error: string | null;
}

/**
 * Navigate to the family member schedule page and parse the listed activities.
 * The schedule URL uses view=2 (list view) for easiest parsing.
 */
export async function readCurrentRegistrations(): Promise<ReadRegistrationsResult> {
  const scrapedAt = new Date().toISOString();

  // Acquire session inside the error boundary so auth/browser failures
  // return a structured error result rather than throwing to Express.
  let page: Page;
  try {
    page = await getAuthenticatedPage();
  } catch (authErr) {
    const message = authErr instanceof Error ? authErr.message : String(authErr);
    logger.error({ err: message }, "Failed to acquire authenticated page for registrations");
    return {
      registrations: [],
      scrapedAt,
      source: "live",
      error: `Authentication/browser failure: ${message}`,
    };
  }

  try {
    const scheduleUrl =
      `${SITE_URL}/myaccount/familymemberschedule` +
      `?onlineSiteId=0&memberIds=${MEMBER_ID}&view=2`;

    logger.info({ url: scheduleUrl }, "Navigating to family member schedule");
    await page.goto(scheduleUrl, { waitUntil: "networkidle", timeout: 30_000 });

    // Wait for the page content to load (React SPA)
    await page.waitForTimeout(1_500);

    // Try to find activity entries. Active Network renders activities in
    // various containers depending on the view. We try several patterns.
    const registrations: ScrapedRegistration[] = [];

    // Strategy 1: look for schedule activity rows/cards
    const activityRows = await page
      .locator(
        [
          ".schedule-activity",
          ".activity-item",
          ".enrolled-activity",
          "tr.activity-row",
          "[data-testid*='activity']",
          ".registration-item",
          ".course-item",
          ".activity-card",
        ].join(", ")
      )
      .all();

    if (activityRows.length > 0) {
      logger.info({ count: activityRows.length }, "Found activity rows");

      for (const row of activityRows) {
        const name = await row.locator(".activity-name, .course-name, h3, h4, strong").first().textContent().catch(() => null);
        const dates = await row.locator(".dates, .date-range, .activity-dates").first().textContent().catch(() => null);
        const times = await row.locator(".times, .time, .activity-time").first().textContent().catch(() => null);
        const location = await row.locator(".location, .facility, .site-name").first().textContent().catch(() => null);
        const status = await row.locator(".status, .enrollment-status, .badge").first().textContent().catch(() => null);

        if (name?.trim()) {
          registrations.push({
            name: name.trim(),
            level: null,
            dates: dates?.trim() ?? null,
            times: times?.trim() ?? null,
            location: location?.trim() ?? null,
            status: status?.trim() ?? "Registered",
          });
        }
      }
    }

    // Strategy 2: look for a table with activity data
    if (registrations.length === 0) {
      const tableRows = await page.locator("table tbody tr").all();
      for (const row of tableRows) {
        const cells = await row.locator("td").all();
        if (cells.length >= 2) {
          const name = await cells[0]?.textContent().catch(() => null);
          const dates = await cells[1]?.textContent().catch(() => null);
          const times = await cells[2]?.textContent().catch(() => null);
          const location = await cells[3]?.textContent().catch(() => null);

          if (name?.trim()) {
            registrations.push({
              name: name.trim(),
              level: null,
              dates: dates?.trim() ?? null,
              times: times?.trim() ?? null,
              location: location?.trim() ?? null,
              status: "Registered",
            });
          }
        }
      }
    }

    // Strategy 3: generic text extraction – look for any element that looks
    // like an activity name near date/time info
    if (registrations.length === 0) {
      logger.warn(
        "Could not find activity rows with standard selectors – attempting generic extraction"
      );

      // Get page text and look for structured sections
      const bodyText = await page.locator("body").innerText().catch(() => "");
      logger.info({ bodyLength: bodyText.length }, "Page body text length");

      if (bodyText.includes("no activities") || bodyText.includes("No registrations")) {
        logger.info("Page indicates no current registrations");
        // Return empty – no activities enrolled
      } else if (bodyText.length < 100) {
        // Page probably didn't load properly
        return {
          registrations: [],
          scrapedAt,
          source: "live",
          error: "Schedule page did not load – session may have expired or site is unavailable",
        };
      }
    }

    logger.info({ count: registrations.length }, "Scraped registrations");

    return {
      registrations,
      scrapedAt,
      source: "live",
      error: registrations.length === 0 ? "No activity rows found on schedule page – selectors may need updating for current site version" : null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message }, "Error reading registrations");
    return {
      registrations: [],
      scrapedAt,
      source: "live",
      error: message,
    };
  } finally {
    releaseBrowserLock();
  }
}
