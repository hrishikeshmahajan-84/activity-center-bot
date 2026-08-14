/**
 * Upcoming class search against the Burnaby Active Communities PUBLIC catalog.
 * No authentication needed — this is the same API the public activity search
 * page uses. Results are cached in-process per keyword for 30 minutes.
 */

import { logger } from "./logger";
import { SITE_URL } from "./scraper/session";

export interface UpcomingClass {
  keyword: string;
  name: string;
  courseNumber: string | null;
  dateStart: string | null;
  dateEnd: string | null;
  daysOfWeek: string | null;
  times: string | null;
  site: string | null;
  openings: number | null;
  status: string | null;
  registrationDate: string | null;
}

interface CatalogItem {
  name?: string;
  number?: string;
  date_range_start?: string;
  date_range_end?: string;
  days_of_week?: string;
  time_range?: string;
  site?: string;
  openings?: string;
  activity_online_start_time?: string;
  urgent_message?: { status_description?: string | null };
}

const CACHE_TTL_MS = 30 * 60_000;
const cache = new Map<string, { at: number; classes: UpcomingClass[] }>();

const MAX_PER_KEYWORD = 4;

// Catalog names: "Edmonds Community Centre (ECC)", "Rosemary Brown Recreation Centre (RBR)"
const ALLOWED_SITES = ["edmonds", "rosemary brown"];

async function searchKeyword(keyword: string): Promise<UpcomingClass[]> {
  const cached = cache.get(keyword);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.classes;

  const res = await fetch(`${SITE_URL}/rest/activities/list?locale=en-US`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      page_info: JSON.stringify({ order_by: "", page_number: 1, total_records_per_page: 60 }),
    },
    body: JSON.stringify({
      activity_search_pattern: { activity_keyword: keyword },
      activity_transfer_pattern: {},
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json()) as {
    headers?: { response_code?: string };
    body?: { activity_items?: CatalogItem[] };
  };
  if (data.headers?.response_code !== "0000") {
    throw new Error(`Catalog search failed for "${keyword}" (code ${data.headers?.response_code})`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const kw = keyword.toLowerCase();

  const classes = (data.body?.activity_items ?? [])
    // Only classes whose name actually starts with the level keyword
    // ("Preschool 4: Sea Lion" for keyword "Preschool 4"), still running or upcoming.
    .filter((i) => (i.name ?? "").toLowerCase().startsWith(kw))
    .filter((i) => (i.date_range_end ?? "") >= today)
    // Only show classes at the two centres Agastya attends
    .filter((i) => ALLOWED_SITES.some((s) => (i.site ?? "").toLowerCase().includes(s)))
    // Skip full classes — no point suggesting something he can't get into
    .filter((i) => (i.urgent_message?.status_description ?? "") !== "Full")
    .sort((a, b) => (a.date_range_start ?? "").localeCompare(b.date_range_start ?? ""))
    .slice(0, MAX_PER_KEYWORD)
    .map((i): UpcomingClass => ({
      keyword,
      name: (i.name ?? "").trim(),
      courseNumber: i.number?.trim() || null,
      dateStart: i.date_range_start || null,
      dateEnd: i.date_range_end || null,
      daysOfWeek: i.days_of_week || null,
      times: i.time_range || null,
      site: i.site || null,
      openings: i.openings != null && i.openings !== "" ? Number(i.openings) : null,
      status: i.urgent_message?.status_description || null,
      registrationDate: i.activity_online_start_time || null,
    }));

  cache.set(keyword, { at: Date.now(), classes });
  return classes;
}

export async function getUpcomingClasses(keywords: string[]): Promise<{
  classes: UpcomingClass[];
  fetchedAt: string;
  error: string | null;
}> {
  const fetchedAt = new Date().toISOString();
  const results = await Promise.allSettled(keywords.map(searchKeyword));
  const classes: UpcomingClass[] = [];
  const errors: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") classes.push(...r.value);
    else {
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      logger.warn({ err: msg }, "Upcoming class search failed for a keyword");
      errors.push(msg);
    }
  }
  return { classes, fetchedAt, error: errors.length > 0 ? errors.join("; ") : null };
}
