import { Router, type IRouter } from "express";
import { db, activityTargetsTable } from "@workspace/db";
import {
  GetSchedulerStatusResponse,
  TriggerSchedulerResponse,
  TriggerSchedulerNowResponse,
} from "@workspace/api-zod";
import {
  runCheckCycle,
  getSchedulerStatus,
  getVancouverTime,
} from "../lib/scheduler";
import { requireApiKey } from "../middleware/apiKey";

const router: IRouter = Router();

// ─── GET /scheduler/status ────────────────────────────────────────────────────

router.get("/scheduler/status", async (_req, res): Promise<void> => {
  const targets = await db.select().from(activityTargetsTable);

  const now = new Date();
  const schedulerStatus = getSchedulerStatus();
  const van = getVancouverTime(now);

  const targetStatuses = targets.map((t) => {
    // Determine scheduler state
    let schedulerState: "waiting" | "active_window" | "booked" | "cancelled" =
      "waiting";

    if (t.status === "booked") {
      schedulerState = "booked";
    } else if (t.status === "cancelled") {
      schedulerState = "cancelled";
    } else if (t.registrationDate === van.dateStr) {
      // Today is registration day — check whether we're inside the window
      const windowStart = t.checkWindowStart ?? "09:50";
      const windowEnd = t.checkWindowEnd ?? "10:10";
      const parseTime = (s: string) => {
        const [h, m] = s.split(":").map(Number);
        return (h ?? 0) * 60 + (m ?? 0);
      };
      const currentMin = van.totalMinutes;
      if (
        currentMin >= parseTime(windowStart) &&
        currentMin < parseTime(windowEnd)
      ) {
        schedulerState = "active_window";
      }
    }

    // Compute nextCheckAt
    let nextCheckAt: string | null = null;
    if (t.status === "active" && t.registrationDate) {
      // Use America/Vancouver offset — dynamically determine DST offset
      // The registration date string plus window start time in Vancouver
      // We append the registration date + window start and interpret in Vancouver by
      // letting the browser / display layer handle it. We store as ISO UTC.
      const windowStart = t.checkWindowStart ?? "09:50";
      const windowEnd = t.checkWindowEnd ?? "10:10";

      // Build a Vancouver-midnight for the registration date, then add window start
      const regDateVan = new Date(
        `${t.registrationDate}T${windowStart}:00`
      );
      // Shift to account for Vancouver offset (-07 PDT or -08 PST)
      // We use Intl to figure out what UTC instant corresponds to registration day 9am Vancouver
      const testDate = new Date(`${t.registrationDate}T00:00:00`);
      const offsetMinutes = getVancouverUtcOffsetMinutes(testDate);
      const windowStartMinutes = parseTimeStr(windowStart);
      const windowEndMinutes = parseTimeStr(windowEnd);

      const windowStartUtc = new Date(
        Date.UTC(
          testDate.getUTCFullYear(),
          testDate.getUTCMonth(),
          testDate.getUTCDate(),
          0,
          windowStartMinutes - offsetMinutes
        )
      );
      const windowEndUtc = new Date(
        Date.UTC(
          testDate.getUTCFullYear(),
          testDate.getUTCMonth(),
          testDate.getUTCDate(),
          0,
          windowEndMinutes - offsetMinutes
        )
      );

      if (now < windowStartUtc) {
        // Window hasn't opened yet — next check is at window start
        nextCheckAt = windowStartUtc.toISOString();
      } else if (now < windowEndUtc && schedulerState === "active_window") {
        // We're in the window — next check is in ~60 seconds
        nextCheckAt = new Date(now.getTime() + 60_000).toISOString();
      }
      // After window end: null (nothing scheduled)

      // Suppress unused variable warning
      void regDateVan;
    }

    return {
      targetId: t.id,
      activityName: t.activityName,
      level: t.level,
      registrationDate: t.registrationDate ?? null,
      checkWindowStart: t.checkWindowStart ?? null,
      checkWindowEnd: t.checkWindowEnd ?? null,
      schedulerState,
      nextCheckAt: nextCheckAt ? new Date(nextCheckAt) : null,
      lastCheckedAt: t.lastCheckedAt ?? null,
    };
  });

  res.json(
    GetSchedulerStatusResponse.parse({
      isRunning: schedulerStatus.isRunning,
      smsConfigured: schedulerStatus.smsConfigured,
      targets: targetStatuses,
      checkedAt: now.toISOString(),
      lastTickAt: schedulerStatus.lastTickAt
        ? schedulerStatus.lastTickAt.toISOString()
        : null,
    })
  );
});

// ─── POST /scheduler/trigger ──────────────────────────────────────────────────
// Runs the check cycle respecting the time window.
// Requires BURNABY_API_KEY bearer token — this can execute real purchases.

router.post("/scheduler/trigger", requireApiKey, async (_req, res): Promise<void> => {
  const results = await runCheckCycle(false); // honour time window
  const bookedCount = results.filter((r) => r.action === "booked").length;
  const activeCount = results.filter((r) => r.action !== "skipped").length;

  res.json(
    TriggerSchedulerResponse.parse({
      triggered: true,
      message:
        activeCount === 0
          ? "No active targets are within a check window right now."
          : bookedCount > 0
            ? `${bookedCount} booking${bookedCount > 1 ? "s" : ""} made!`
            : `Checked ${activeCount} target${activeCount > 1 ? "s" : ""} — no spots available yet.`,
      targetsChecked: results.length,
      results,
    })
  );
});

// ─── POST /scheduler/trigger-now ─────────────────────────────────────────────
// Force-runs check-and-book for ALL active targets regardless of date/time.
// Requires BURNABY_API_KEY bearer token — bypasses time-window guards entirely.

router.post("/scheduler/trigger-now", requireApiKey, async (_req, res): Promise<void> => {
  const results = await runCheckCycle(true); // force — ignore time window
  const bookedCount = results.filter((r) => r.action === "booked").length;

  res.json(
    TriggerSchedulerNowResponse.parse({
      triggered: true,
      message:
        results.length === 0
          ? "No active targets found."
          : bookedCount > 0
            ? `${bookedCount} booking${bookedCount > 1 ? "s" : ""} made!`
            : `Checked ${results.length} target${results.length > 1 ? "s" : ""}.`,
      targetsChecked: results.length,
      results,
    })
  );
});

export default router;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTimeStr(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Returns the UTC offset in minutes for America/Vancouver on a given UTC date.
 * e.g. PDT = -7 h = -420 min → returns -420
 */
function getVancouverUtcOffsetMinutes(utcDate: Date): number {
  // Format the date in Vancouver and compare to UTC
  const vanStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(utcDate)
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});

  const vanMs = Date.UTC(
    parseInt(vanStr.year!),
    parseInt(vanStr.month!) - 1,
    parseInt(vanStr.day!),
    parseInt(vanStr.hour!),
    parseInt(vanStr.minute!)
  );

  return Math.round((vanMs - utcDate.getTime()) / 60_000);
}
