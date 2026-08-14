import { Router, type IRouter } from "express";
import {
  GetCurrentRegistrationsResponse,
  TriggerScrapeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Stub response — real implementation in Task 2 (Playwright scraper)
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

router.get("/registrations/current", async (_req, res): Promise<void> => {
  res.json(GetCurrentRegistrationsResponse.parse(stubRegistrations()));
});

router.post("/registrations/scrape", async (_req, res): Promise<void> => {
  // Stub: real scraper wired in Task 2
  res.json(TriggerScrapeResponse.parse(stubRegistrations()));
});

export default router;
