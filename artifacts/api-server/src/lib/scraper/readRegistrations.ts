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

interface FamilyScheduleEntry {
  schedule_date: string;
  time_text: string | null;
  activity_name: string | null;
  is_waitlisted: boolean;
  customer_id: number;
  customer_name: string | null;
  centers?: Array<{ name: string }>;
  facilities?: Array<{ facility_name: string }>;
}

/**
 * Query the ActiveCommunities REST API the schedule SPA uses internally.
 * Runs through the authenticated Playwright session (shares cookies), so it
 * works exactly like the browser. Far more reliable than HTML scraping.
 */
async function readViaApi(page: Page): Promise<ScrapedRegistration[] | null> {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  // Fetch the next 8 weeks in one-week chunks (the SPA requests week ranges).
  const entries: FamilyScheduleEntry[] = [];
  for (let week = 0; week < 8; week++) {
    const start = new Date(today.getTime() + week * 7 * 86_400_000);
    const end = new Date(start.getTime() + 6 * 86_400_000);
    const url =
      `${SITE_URL}/rest/myaccount/familyschedules` +
      `?start_date=${fmt(start)}&end_date=${fmt(end)}&locale=en-US`;
    // Run the fetch inside the page so it is indistinguishable from the SPA's
    // own request (cookies, CSRF headers, referer all handled by the browser).
    const data = (await page.evaluate(async (u: string) => {
      const r = await fetch(u, { credentials: "include" });
      return r.json();
    }, url)) as {
      headers?: { response_code?: string };
      body?: { schedules?: FamilyScheduleEntry[] };
    };
    if (data.headers?.response_code !== "0000") {
      logger.warn({ code: data.headers?.response_code, url }, "familyschedules API returned error code");
      return null;
    }
    const weekEntries = data.body?.schedules ?? [];
    logger.info({ week, start: fmt(start), count: weekEntries.length }, "familyschedules week fetched");
    entries.push(...weekEntries);
  }

  // Validate the configured member ID against the family list from the site
  // itself – a stale BURNABY_MEMBER_ID otherwise silently filters out
  // everything (or targets the wrong family member).
  let memberId = Number(MEMBER_ID);
  try {
    const filters = (await page.evaluate(async (u: string) => {
      const r = await fetch(u, { credentials: "include" });
      return r.json();
    }, `${SITE_URL}/rest/myaccount/familyschedules/filters?locale=en-US`)) as {
      body?: { filters?: { schedule_customer?: Array<{ customer_id: number; first_name: string; is_login_user: boolean }> } };
    };
    const family = filters.body?.filters?.schedule_customer ?? [];
    if (family.length > 0 && !family.some((c) => c.customer_id === memberId)) {
      // Configured ID isn't in this family – prefer a non-login-user child
      // account; if ambiguous, log and keep no filter rather than wrong data.
      const nonLogin = family.filter((c) => !c.is_login_user);
      logger.warn(
        { configured: memberId, family: family.map((c) => ({ id: c.customer_id, name: c.first_name })) },
        "Configured BURNABY_MEMBER_ID not found in family list"
      );
      if (nonLogin.length === 1) memberId = nonLogin[0].customer_id;
    }
  } catch (fErr) {
    logger.warn({ err: fErr instanceof Error ? fErr.message : String(fErr) }, "Could not validate member ID against family list");
  }

  const mine = entries.filter((e) => !memberId || e.customer_id === memberId);

  // Aggregate individual class sessions into one registration per activity.
  const byActivity = new Map<
    string,
    { first: string; last: string; times: Set<string>; locations: Set<string>; waitlisted: boolean }
  >();
  for (const e of mine) {
    const name = e.activity_name?.trim();
    if (!name) continue;
    const agg = byActivity.get(name) ?? {
      first: e.schedule_date,
      last: e.schedule_date,
      times: new Set<string>(),
      locations: new Set<string>(),
      waitlisted: false,
    };
    if (e.schedule_date < agg.first) agg.first = e.schedule_date;
    if (e.schedule_date > agg.last) agg.last = e.schedule_date;
    if (e.time_text) agg.times.add(e.time_text);
    const loc = [e.centers?.[0]?.name, e.facilities?.[0]?.facility_name].filter(Boolean).join(" – ");
    if (loc) agg.locations.add(loc);
    agg.waitlisted = agg.waitlisted || e.is_waitlisted;
    byActivity.set(name, agg);
  }

  return [...byActivity.entries()].map(([rawName, agg]) => {
    // Names look like "Gliders 2 -- 112636"; split off the course number.
    const [name, courseNo] = rawName.split(/\s*--\s*/);
    return {
      name: (name ?? rawName).trim(),
      level: courseNo ? `#${courseNo.trim()}` : null,
      dates: agg.first === agg.last ? agg.first : `${agg.first} – ${agg.last}`,
      times: [...agg.times].join(", ") || null,
      location: [...agg.locations].join("; ") || null,
      status: agg.waitlisted ? "Waitlisted" : "Registered",
    };
  });
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
    // Preferred path: the site's own JSON API via the authenticated session.
    try {
      const apiRegs = await readViaApi(page);
      if (apiRegs) {
        logger.info({ count: apiRegs.length }, "Scraped registrations via familyschedules API");
        return { registrations: apiRegs, scrapedAt, source: "live", error: null };
      }
    } catch (apiErr) {
      logger.warn(
        { err: apiErr instanceof Error ? apiErr.message : String(apiErr) },
        "familyschedules API path failed – falling back to HTML scraping"
      );
    }

    const scheduleUrl =
      `${SITE_URL}/myaccount/familymemberschedule` +
      `?onlineSiteId=0&memberIds=${MEMBER_ID}&view=2`;

    logger.info({ url: scheduleUrl }, "Navigating to family member schedule");

    // Capture the SPA's backend JSON responses – far more reliable than HTML.
    const apiCaptures: Array<{ url: string; body: string }> = [];
    const onResponse = async (resp: import("playwright").Response) => {
      try {
        const u = resp.url();
        if (u.includes("/rest/") && (resp.headers()["content-type"] ?? "").includes("json")) {
          const body = await resp.text();
          apiCaptures.push({ url: u, body });
        }
      } catch {
        /* ignore */
      }
    };
    page.on("response", onResponse);

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

    if (registrations.length === 0) {
      // Diagnostic dump: persist what the page actually contained so selector
      // failures can be debugged from logs/files instead of guessing.
      try {
        const fsMod = await import("fs");
        const html = await page.content();
        const bodyText = await page.locator("body").innerText().catch(() => "");
        fsMod.writeFileSync("/tmp/schedule-page.html", html);
        fsMod.writeFileSync("/tmp/schedule-page.txt", bodyText);
        fsMod.writeFileSync(
          "/tmp/schedule-api-captures.json",
          JSON.stringify(apiCaptures.map((c) => ({ url: c.url, body: c.body.slice(0, 20000) })), null, 2)
        );
        logger.warn(
          { url: page.url(), title: await page.title().catch(() => null), bodyPreview: bodyText.slice(0, 500) },
          "Zero registrations parsed – page snapshot saved to /tmp/schedule-page.{html,txt}"
        );
      } catch {
        // best-effort diagnostics only
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
