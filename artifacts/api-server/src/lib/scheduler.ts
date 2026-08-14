/**
 * Scheduler — drives the auto-booking check loop.
 *
 * Behaviour:
 *  • Wakes up every CHECK_INTERVAL_MS (60 s default).
 *  • For each active target whose registrationDate matches today (Vancouver time)
 *    and whose current time falls in the check window, calls findAndBook().
 *  • On success: marks target as "booked", writes to booking_log, sends SMS.
 *  • On scraper error: sends SMS immediately (to allow manual intervention).
 *  • When the window closes without a booking: sends a single end-of-window SMS.
 *  • forceRun=true (manual trigger) ignores the date/time window — useful for
 *    testing the full flow on demand.
 */

import { eq } from "drizzle-orm";
import { db, activityTargetsTable, bookingLogTable } from "@workspace/db";
import { findAndBook } from "./scraper";
import {
  smsConfigured,
  notifyBookingSuccess,
  notifyWindowOpening,
  notifyWindowEnded,
  notifyScraperError,
} from "./sms";
import { logger } from "./logger";

// ─── Constants ───────────────────────────────────────────────────────────────

const CHECK_INTERVAL_MS = 60_000; // 60 seconds between checks

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TargetTickResult {
  targetId: number;
  activityName: string;
  level: string;
  action: "booked" | "checked" | "error" | "window_ended" | "skipped";
  outcome?: string | null;
  message?: string | null;
  smsSent: boolean;
}

// ─── In-process state ────────────────────────────────────────────────────────

// State that resets if the server restarts — that's intentional.
interface TargetState {
  windowEndedNotified: boolean;
  bookedThisSession: boolean;
  /**
   * Window key for which a pre-window reminder was successfully delivered,
   * formatted as "<registrationDate>:<windowStart>" (e.g. "2026-08-14:09:00").
   * Null means no reminder has been sent yet for the current in-process session.
   * Scoped to the window so that if a target's registration date is updated the
   * reminder fires again for the new date.
   */
  reminderSentForWindow: string | null;
}

const targetStates = new Map<number, TargetState>();
let intervalHandle: ReturnType<typeof setInterval> | null = null;
let isChecking = false; // prevent concurrent tick overlaps
let lastTickAt: Date | null = null;

function getOrInitTargetState(id: number): TargetState {
  if (!targetStates.has(id)) {
    targetStates.set(id, { windowEndedNotified: false, bookedThisSession: false, reminderSentForWindow: null });
  }
  return targetStates.get(id)!;
}

/** Wipes all in-process target state. Only call this from tests. */
export function _resetSchedulerStateForTest(): void {
  targetStates.clear();
}

// ─── Timezone helpers ─────────────────────────────────────────────────────────

/** Returns date/time components for a UTC Date interpreted in America/Vancouver. */
export function getVancouverTime(date: Date = new Date()): {
  dateStr: string; // "YYYY-MM-DD"
  hours: number;
  minutes: number;
  totalMinutes: number; // hours*60 + minutes
} {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hours = parseInt(get("hour"), 10);
  const minutes = parseInt(get("minute"), 10);

  return {
    dateStr: `${year}-${month}-${day}`,
    hours,
    minutes,
    totalMinutes: hours * 60 + minutes,
  };
}

/** Parse "HH:MM" → total minutes since midnight. */
function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

// ─── Single-target tick ───────────────────────────────────────────────────────

async function tickTarget(
  target: typeof activityTargetsTable.$inferSelect,
  now: Date,
  forceRun: boolean
): Promise<TargetTickResult> {
  const van = getVancouverTime(now);
  const state = getOrInitTargetState(target.id);

  const base: Omit<TargetTickResult, "action" | "outcome" | "message" | "smsSent"> = {
    targetId: target.id,
    activityName: target.activityName,
    level: target.level,
  };

  // Skip targets already booked this server session
  if (state.bookedThisSession) {
    return { ...base, action: "skipped", message: "Already booked this session", smsSent: false };
  }

  // Skip targets whose registration date has already passed
  if (!forceRun && target.registrationDate && van.dateStr > target.registrationDate) {
    return { ...base, action: "skipped", message: "Registration date has passed", smsSent: false };
  }

  const windowStart = target.checkWindowStart ?? "09:00";
  const windowEnd = target.checkWindowEnd ?? "11:00";
  const startMin = parseTime(windowStart);
  const endMin = parseTime(windowEnd);
  const currentMin = van.totalMinutes;

  if (!forceRun) {
    // Must be the correct registration day (in Vancouver date)
    if (!target.registrationDate || van.dateStr !== target.registrationDate) {
      return { ...base, action: "skipped", message: "Not registration day", smsSent: false };
    }

    // Before window opens
    if (currentMin < startMin) {
      // Send a 30-minute heads-up reminder once per registration window.
      // The window key includes both the registration date and the window start
      // time so that if the target is rescheduled the reminder fires again.
      const minutesToOpen = startMin - currentMin;
      const windowKey = `${target.registrationDate}:${windowStart}`;
      if (minutesToOpen <= 30 && state.reminderSentForWindow !== windowKey) {
        const smsSent = await notifyWindowOpening(target);
        // Only record the reminder as sent when delivery was confirmed.
        // A failed send (smsSent=false) leaves the flag unset so the next
        // tick retries — providing bounded retry within the pre-window period.
        if (smsSent) {
          state.reminderSentForWindow = windowKey;
        }
        logger.info(
          { targetId: target.id, activityName: target.activityName, minutesToOpen, delivered: smsSent },
          "Pre-window reminder attempted"
        );
        return {
          ...base,
          action: "skipped",
          message: smsSent
            ? `Reminder sent – window opens in ${minutesToOpen} min`
            : `Reminder delivery failed – will retry next tick`,
          smsSent,
        };
      }
      return { ...base, action: "skipped", message: "Before check window", smsSent: false };
    }

    // Window has closed
    if (currentMin >= endMin) {
      if (!state.windowEndedNotified) {
        state.windowEndedNotified = true;
        const smsSent = await notifyWindowEnded(target);

        // Write window_closed to booking log
        await db.insert(bookingLogTable).values({
          targetId: target.id,
          activityName: target.activityName,
          level: target.level,
          outcome: "window_closed",
          notes: `Registration window closed at ${windowEnd} PT without a successful booking.`,
        });

        logger.info(
          { targetId: target.id, activityName: target.activityName },
          "Registration window ended without booking"
        );

        return { ...base, action: "window_ended", message: `Window closed at ${windowEnd} PT`, smsSent };
      }
      return { ...base, action: "skipped", message: "Window already ended (notification sent)", smsSent: false };
    }
  }

  // ── We're in the window (or force run) — attempt check-and-book ──────────
  logger.info(
    { targetId: target.id, activityName: target.activityName, level: target.level, forceRun },
    "Running check-and-book"
  );

  const result = await findAndBook({
    activityName: target.activityName,
    level: target.level,
    dryRun: false,
  });

  const logOutcome =
    result.outcome === "success"
      ? "success"
      : result.outcome === "no_spot" || result.outcome === "registration_not_open"
        ? "no_spot"
        : result.outcome === "scraper_error" || result.outcome === "not_configured"
          ? "scraper_error"
          : "failed";

  // Write to booking log
  await db.insert(bookingLogTable).values({
    targetId: target.id,
    activityName: target.activityName,
    level: target.level,
    outcome: logOutcome,
    confirmationNumber: result.confirmationNumber ?? null,
    classDate: result.classDate ?? null,
    classTime: result.classTime ?? null,
    notes: result.message,
  });

  // Update lastCheckedAt on the target
  await db
    .update(activityTargetsTable)
    .set({ lastCheckedAt: now })
    .where(eq(activityTargetsTable.id, target.id));

  let smsSent = false;

  if (result.outcome === "success") {
    // Mark booked in DB and in-process state
    await db
      .update(activityTargetsTable)
      .set({ status: "booked" })
      .where(eq(activityTargetsTable.id, target.id));

    state.bookedThisSession = true;
    smsSent = await notifyBookingSuccess(target, result);

    logger.info(
      { targetId: target.id, confirmation: result.confirmationNumber },
      "Booking successful!"
    );

    return {
      ...base,
      action: "booked",
      outcome: result.outcome,
      message: result.message,
      smsSent,
    };
  }

  if (result.outcome === "scraper_error" || result.outcome === "not_configured") {
    smsSent = await notifyScraperError(target, result.message);
    return {
      ...base,
      action: "error",
      outcome: result.outcome,
      message: result.message,
      smsSent,
    };
  }

  // no_spot / registration_not_open / failed — keep checking on next tick
  return {
    ...base,
    action: "checked",
    outcome: result.outcome,
    message: result.message,
    smsSent,
  };
}

// ─── Full tick across all active targets ──────────────────────────────────────

export async function runCheckCycle(forceRun = false): Promise<TargetTickResult[]> {
  if (isChecking) {
    logger.warn("Scheduler tick skipped – previous check still in progress");
    return [];
  }

  isChecking = true;
  const now = new Date();
  lastTickAt = now;

  try {
    const targets = await db
      .select()
      .from(activityTargetsTable)
      .where(eq(activityTargetsTable.status, "active"));

    logger.debug({ count: targets.length }, "Scheduler tick");

    const results = await Promise.allSettled(
      targets.map((t) => tickTarget(t, now, forceRun))
    );

    return results.map((r, i): TargetTickResult => {
      if (r.status === "fulfilled") return r.value;
      const target = targets[i]!;
      logger.error({ err: r.reason, targetId: target.id }, "tickTarget threw unexpectedly");
      return {
        targetId: target.id,
        activityName: target.activityName,
        level: target.level,
        action: "error",
        outcome: "scraper_error",
        message: r.reason instanceof Error ? r.reason.message : String(r.reason),
        smsSent: false,
      };
    });
  } finally {
    isChecking = false;
  }
}

// ─── Scheduler lifecycle ──────────────────────────────────────────────────────

export function startScheduler(): void {
  if (intervalHandle) {
    logger.warn("Scheduler already started");
    return;
  }

  logger.info({ intervalMs: CHECK_INTERVAL_MS }, "Starting scheduler");

  // Run immediately in case the server restarted inside an active window
  runCheckCycle().catch((err) => logger.error({ err }, "Initial scheduler tick failed"));

  intervalHandle = setInterval(() => {
    runCheckCycle().catch((err) => logger.error({ err }, "Scheduler tick failed"));
  }, CHECK_INTERVAL_MS);

  // Prevent the interval from keeping the process alive if there's nothing else
  intervalHandle.unref?.();
}

export function stopScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info("Scheduler stopped");
  }
}

// ─── Status snapshot (for the API route) ─────────────────────────────────────

export function getSchedulerStatus(): {
  isRunning: boolean;
  isChecking: boolean;
  lastTickAt: Date | null;
  smsConfigured: boolean;
} {
  return {
    isRunning: intervalHandle !== null,
    isChecking,
    lastTickAt,
    smsConfigured: smsConfigured(),
  };
}
