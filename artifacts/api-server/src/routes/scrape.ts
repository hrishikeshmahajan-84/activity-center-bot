import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, activityTargetsTable, bookingLogTable } from "@workspace/db";
import {
  CheckAndBookParams,
  CheckAndBookBody,
  CheckAndBookResponse,
  GetScraperStatusResponse,
} from "@workspace/api-zod";
import {
  readCurrentRegistrations,
  findAndBook,
  credentialsConfigured,
  SITE_URL,
  MEMBER_ID,
} from "../lib/scraper";
import { requireApiKey } from "../middleware/apiKey";

const router: IRouter = Router();

// GET /scrape/status — configuration health check
router.get("/scrape/status", async (_req, res): Promise<void> => {
  res.json(
    GetScraperStatusResponse.parse({
      configured: credentialsConfigured(),
      hasCredentials: credentialsConfigured(),
      memberId: MEMBER_ID,
      siteUrl: SITE_URL,
    })
  );
});

// POST /scrape/check-and-book/:targetId — requires valid API key
router.post("/scrape/check-and-book/:targetId", requireApiKey, async (req, res): Promise<void> => {
  const params = CheckAndBookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Fail closed: if a body was sent, it must be valid.
  // Only default dryRun to false when no body was provided at all.
  const hasBody = req.body && Object.keys(req.body).length > 0;
  let dryRun = false;
  if (hasBody) {
    const body = CheckAndBookBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({
        error: "Invalid request body",
        details: body.error.message,
      });
      return;
    }
    dryRun = body.data.dryRun ?? false;
  }

  // Load the target from DB
  const [target] = await db
    .select()
    .from(activityTargetsTable)
    .where(eq(activityTargetsTable.id, params.data.targetId));

  if (!target) {
    res.status(404).json({ error: "Target not found" });
    return;
  }

  req.log.info(
    { targetId: target.id, activityName: target.activityName, level: target.level, dryRun },
    "Starting check-and-book"
  );

  // Run the scraper
  const result = await findAndBook({
    activityName: target.activityName,
    level: target.level,
    classDay: target.classDay ?? null,
    classTime: target.classTime ?? null,
    dryRun,
  });

  // Map BookingOutcome to the booking_log outcome enum
  const logOutcome = ((): string => {
    switch (result.outcome) {
      case "success": return "success";
      case "no_spot": return "no_spot";
      case "registration_not_open": return "no_spot";
      case "scraper_error": return "scraper_error";
      case "not_configured": return "scraper_error";
      case "failed": return "failed";
      default: return "failed";
    }
  })();

  // Write to booking log for every attempt, including dry runs.
  // Dry-run entries get a "[DRY RUN]" prefix in notes so the dashboard can show them clearly.
  let logEntryId: number | null = null;
  const [logEntry] = await db
    .insert(bookingLogTable)
    .values({
      targetId: target.id,
      activityName: target.activityName,
      level: target.level,
      outcome: logOutcome,
      confirmationNumber: result.confirmationNumber ?? null,
      classDate: result.classDate ?? null,
      classTime: result.classTime ?? null,
      notes: dryRun ? `[DRY RUN] ${result.message}` : result.message,
    })
    .returning();
  logEntryId = logEntry?.id ?? null;

  // If successfully booked, update target status
  if (result.outcome === "success" && !dryRun) {
    await db
      .update(activityTargetsTable)
      .set({ status: "booked" })
      .where(eq(activityTargetsTable.id, target.id));
  }

  // Update lastCheckedAt
  await db
    .update(activityTargetsTable)
    .set({ lastCheckedAt: new Date() })
    .where(eq(activityTargetsTable.id, target.id));

  req.log.info({ outcome: result.outcome, confirmationNumber: result.confirmationNumber }, "check-and-book complete");

  res.json(
    CheckAndBookResponse.parse({
      outcome: result.outcome,
      message: result.message,
      confirmationNumber: result.confirmationNumber ?? null,
      classDate: result.classDate ?? null,
      classTime: result.classTime ?? null,
      dryRun,
      logEntryId,
    })
  );
});

// POST /scrape/dry-run/:targetId — no API key required (always dryRun=true, can't book)
router.post("/scrape/dry-run/:targetId", async (req, res): Promise<void> => {
  const params = CheckAndBookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [target] = await db
    .select()
    .from(activityTargetsTable)
    .where(eq(activityTargetsTable.id, params.data.targetId));

  if (!target) {
    res.status(404).json({ error: "Target not found" });
    return;
  }

  req.log.info(
    { targetId: target.id, activityName: target.activityName, level: target.level },
    "Starting dry-run check-and-book"
  );

  const result = await findAndBook({
    activityName: target.activityName,
    level: target.level,
    classDay: target.classDay ?? null,
    classTime: target.classTime ?? null,
    dryRun: true,
  });

  const logOutcome = ((): string => {
    switch (result.outcome) {
      case "success": return "success";
      case "no_spot": return "no_spot";
      case "registration_not_open": return "no_spot";
      case "scraper_error": return "scraper_error";
      case "not_configured": return "scraper_error";
      default: return "failed";
    }
  })();

  const [logEntry] = await db
    .insert(bookingLogTable)
    .values({
      targetId: target.id,
      activityName: target.activityName,
      level: target.level,
      outcome: logOutcome,
      confirmationNumber: null,
      classDate: result.classDate ?? null,
      classTime: result.classTime ?? null,
      notes: `[DRY RUN] ${result.message}`,
    })
    .returning();

  await db
    .update(activityTargetsTable)
    .set({ lastCheckedAt: new Date() })
    .where(eq(activityTargetsTable.id, target.id));

  res.json(
    CheckAndBookResponse.parse({
      outcome: result.outcome,
      message: result.message,
      confirmationNumber: null,
      classDate: result.classDate ?? null,
      classTime: result.classTime ?? null,
      dryRun: true,
      logEntryId: logEntry?.id ?? null,
    })
  );
});

export default router;
