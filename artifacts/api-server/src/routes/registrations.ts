import { Router, type IRouter } from "express";
import {
  GetCurrentRegistrationsResponse,
  TriggerScrapeResponse,
} from "@workspace/api-zod";
import { readCurrentRegistrations } from "../lib/scraper";
import { credentialsConfigured } from "../lib/scraper/session";
import { requireApiKey } from "../middleware/apiKey";

const router: IRouter = Router();

// Simple in-memory cache for current registrations (valid for 5 minutes)
let cachedResult: {
  registrations: unknown[];
  scrapedAt: string;
  source: "live" | "stub";
  error: string | null;
} | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

// Stub used when credentials are not configured
const stubRegistrations = () => ({
  registrations: [
    {
      name: "Orca Swimming",
      level: "Orca",
      dates: "Jan 11 – Mar 22, 2025",
      times: "Sat 10:00am – 10:30am",
      location: "Bonsor Recreation Complex",
      status: "Registered",
    },
  ],
  scrapedAt: new Date().toISOString(),
  source: "stub" as const,
  error: null,
});

// GET /registrations/current — returns cached result or stub if not configured
router.get("/registrations/current", async (_req, res): Promise<void> => {
  if (!credentialsConfigured()) {
    res.json(GetCurrentRegistrationsResponse.parse(stubRegistrations()));
    return;
  }

  // Return cache if still valid
  if (cachedResult && Date.now() < cacheExpiresAt) {
    res.json(GetCurrentRegistrationsResponse.parse(cachedResult));
    return;
  }

  // Live scrape
  const result = await readCurrentRegistrations();
  cachedResult = result;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;

  res.json(GetCurrentRegistrationsResponse.parse(result));
});

// POST /registrations/scrape — force a fresh scrape, bypasses cache
router.post("/registrations/scrape", async (_req, res): Promise<void> => {
  if (!credentialsConfigured()) {
    res.json(TriggerScrapeResponse.parse(stubRegistrations()));
    return;
  }

  const result = await readCurrentRegistrations();
  // Update cache
  cachedResult = result;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;

  res.json(TriggerScrapeResponse.parse(result));
});

export default router;
