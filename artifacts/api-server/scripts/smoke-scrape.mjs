#!/usr/bin/env node
/**
 * Smoke check: the enrolled-activities scrape must still work end-to-end.
 *
 * Hits POST <base>/registrations/scrape against the running dev server and
 * asserts:
 *   - HTTP 200 with a parseable JSON body
 *   - `error` is null
 *   - `registrations` is a non-empty array
 *   - `source` is "live" (a "stub" response means credentials are missing,
 *     so the check would be meaningless)
 *
 * On failure it classifies the error so regressions are easy to triage:
 *   - BROWSER/AUTH FAILURE  (Playwright binary resolution, login problems)
 *   - MEMBER ID MISMATCH    (stale BURNABY_MEMBER_ID secret)
 *   - SITE CHANGE           (selectors / API shape no longer match the site)
 *
 * Usage: node scripts/smoke-scrape.mjs
 *   SCRAPE_SMOKE_URL overrides the base URL (default http://localhost:80/api).
 */

const BASE = (process.env.SCRAPE_SMOKE_URL ?? "http://localhost:80/api").replace(/\/$/, "");
const URL_ = `${BASE}/registrations/scrape`;
// Live scrape logs in + fetches 8 weeks of schedule; allow generous time.
const TIMEOUT_MS = 180_000;

function fail(category, detail) {
  console.error(`\nSCRAPE SMOKE CHECK FAILED — ${category}`);
  console.error(detail);
  process.exit(1);
}

function classify(error) {
  const msg = String(error);
  if (/BURNABY_MEMBER_ID/i.test(msg)) {
    return [
      "MEMBER ID MISMATCH",
      `The configured BURNABY_MEMBER_ID no longer matches the account's family list.\n` +
        `Fix: update the BURNABY_MEMBER_ID secret.\nServer said: ${msg}`,
    ];
  }
  if (/Authentication\/browser failure|browser|chromium|executable|playwright|launch|login|credential/i.test(msg)) {
    return [
      "BROWSER/AUTH FAILURE",
      `The scraper could not launch the browser or authenticate.\n` +
        `Fix: check Playwright Chromium install (PLAYWRIGHT_BROWSERS_PATH) and the BURNABY_USERNAME/BURNABY_PASSWORD secrets.\nServer said: ${msg}`,
    ];
  }
  return [
    "SITE CHANGE / SCRAPE ERROR",
    `The scrape ran but failed — the Burnaby site's API or page structure may have changed.\n` +
      `Fix: inspect the scraper (readRegistrations.ts) against the current site.\nServer said: ${msg}`,
  ];
}

async function main() {
  console.log(`POST ${URL_} (timeout ${TIMEOUT_MS / 1000}s)…`);
  let res;
  try {
    res = await fetch(URL_, { method: "POST", signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    fail(
      "SERVER UNREACHABLE",
      `Could not reach the dev API server at ${URL_}.\n` +
        `Fix: make sure the "API Server" workflow is running.\nError: ${err}`,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    fail("HTTP ERROR", `Expected 200, got ${res.status}.\nBody: ${body.slice(0, 1000)}`);
  }

  let data;
  try {
    data = await res.json();
  } catch (err) {
    fail("BAD RESPONSE", `Response was not valid JSON: ${err}`);
  }

  if (data.source === "stub") {
    fail(
      "CREDENTIALS NOT CONFIGURED",
      "Server returned stub data — BURNABY_USERNAME/BURNABY_PASSWORD/BURNABY_MEMBER_ID are not configured, so the live scrape was never exercised.",
    );
  }

  if (data.error !== null && data.error !== undefined) {
    const [category, detail] = classify(data.error);
    fail(category, detail);
  }

  if (!Array.isArray(data.registrations) || data.registrations.length === 0) {
    fail(
      "SITE CHANGE / NO REGISTRATIONS",
      "Scrape reported no error but returned zero registrations.\n" +
        "Either Agastya has no current activities, or the site changed and the scraper silently parses nothing.\n" +
        "Fix: verify on the Burnaby site; if activities exist there, update the scraper.",
    );
  }

  console.log(
    `OK — ${data.registrations.length} registration(s), error=null, source=${data.source}, scrapedAt=${data.scrapedAt}`,
  );
  for (const r of data.registrations) {
    console.log(`  • ${r.name}${r.status ? ` [${r.status}]` : ""}${r.dates ? ` (${r.dates})` : ""}`);
  }
}

main();
