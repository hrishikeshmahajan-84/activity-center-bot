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

import { and, eq, isNull, lt, or } from "drizzle-orm";
import { db, activityTargetsTable, bookingLogTable, registrationStatusTable } from "@workspace/db";
import { findAndBook, readCurrentRegistrations } from "./scraper";
import {
  smsConfigured,
  notifyBookingSuccess,
  notifyWindowOpening,
  notifyWindowEnded,
  notifyScraperError,
  notifyWaitlistPromotion,
} from "./sms";
import { logger } from "./logger";

// ─── Constants ───────────────────────────────────────────────────────────────

const CHECK_INTERVAL_MS = 60_000; // 60 seconds between checks

// How often the waitlist watcher scrapes current registrations. A full
// Playwright scrape is heavy (shared browser lock), so this runs less often
// than the booking check loop.
const WAITLIST_CHECK_INTERVAL_MS = 5 * 60_000; // 5 minutes

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

/**
 * Get or create in-process state for a target.
 *
 * @param id          Target row id.
 * @param dbReminder  Value of `reminderSentForWindow` from the DB row — used
 *                    to restore state after a server restart so we never
 *                    double-send a reminder within the same registration window.
 *                    Only applied when the target is first seen by this process.
 */
function getOrInitTargetState(id: number, dbReminder: string | null = null): TargetState {
  if (!targetStates.has(id)) {
    targetStates.set(id, {
      windowEndedNotified: false,
      bookedThisSession: false,
      // Seed from DB so a restart mid-window doesn't re-send the reminder.
      reminderSentForWindow: dbReminder,
    });
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
  // Pass the persisted DB value so a fresh process doesn't re-send a reminder
  // that was already delivered before a restart.
  const state = getOrInitTargetState(target.id, target.reminderSentForWindow ?? null);

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

  const windowStart = target.checkWindowStart ?? "09:50";
  const windowEnd = target.checkWindowEnd ?? "10:10";
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
          // Persist to DB so a server restart in the pre-window zone doesn't
          // re-send the reminder for the same registration window.
          await db
            .update(activityTargetsTable)
            .set({ reminderSentForWindow: windowKey })
            .where(eq(activityTargetsTable.id, target.id));
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
    classDay: target.classDay ?? null,
    classTime: target.classTime ?? null,
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

// ─── Waitlist watcher ─────────────────────────────────────────────────────────

export interface WaitlistWatchResult {
  checked: number;
  promotions: Array<{ activityName: string; level: string | null; smsSent: boolean }>;
  error: string | null;
}

let isWatchingWaitlist = false;
let lastWaitlistCheckAt: Date | null = null;
let waitlistIntervalHandle: ReturnType<typeof setInterval> | null = null;

/**
 * How long an alert claim is honoured before another process may retry it.
 * Covers the crash window between "Twilio accepted the message" and "delivery
 * state persisted": within the lease no other process re-sends.
 */
const ALERT_CLAIM_LEASE_MS = 30 * 60_000;

/**
 * Scrapes current registrations and compares each activity's status with the
 * last persisted status. When a status flips Waitlisted → Registered, sends a
 * promotion SMS. Delivery failures set `alertPending` so the alert is retried
 * on later cycles; success clears it — so exactly one alert per transition.
 */
export async function runWaitlistWatchCycle(): Promise<WaitlistWatchResult | null> {
  if (isWatchingWaitlist) {
    logger.warn("Waitlist watch skipped – previous run still in progress");
    return null;
  }
  isWatchingWaitlist = true;
  lastWaitlistCheckAt = new Date();

  try {
    const result = await readCurrentRegistrations();
    if (result.error) {
      // Do NOT update persisted statuses on a failed/partial scrape — a bogus
      // empty scrape must never overwrite a real "Waitlisted" baseline.
      logger.warn({ err: result.error }, "Waitlist watch: scrape failed – statuses unchanged");
      return { checked: 0, promotions: [], error: result.error };
    }

    const promotions: WaitlistWatchResult["promotions"] = [];

    for (const reg of result.registrations) {
      const status = reg.status ?? "Registered";
      const activityKey = `${reg.name}|${reg.level ?? ""}`;

      const [existing] = await db
        .select()
        .from(registrationStatusTable)
        .where(eq(registrationStatusTable.activityKey, activityKey));

      if (!existing) {
        // First sighting — record baseline, never alert.
        await db.insert(registrationStatusTable).values({
          activityKey,
          activityName: reg.name,
          level: reg.level,
          status,
        });
        continue;
      }

      const wantsAlert =
        (existing.status === "Waitlisted" && status === "Registered") ||
        // A previously detected promotion whose SMS was not delivered yet.
        (existing.alertPending && status === "Registered");

      if (wantsAlert) {
        // Atomically claim the alert BEFORE sending. The conditional WHERE
        // means exactly one process can flip the row from its observed state;
        // a concurrent scheduler (or a retry inside an active lease) gets
        // rowCount=0 and must not send.
        const leaseCutoff = new Date(Date.now() - ALERT_CLAIM_LEASE_MS);
        const claim = (await db
          .update(registrationStatusTable)
          .set({
            status: "Registered",
            alertPending: true,
            alertClaimedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(registrationStatusTable.id, existing.id),
              or(
                // Fresh transition: row still says Waitlisted.
                eq(registrationStatusTable.status, "Waitlisted"),
                // Undelivered alert whose claim is absent or lease-expired.
                and(
                  eq(registrationStatusTable.alertPending, true),
                  or(
                    isNull(registrationStatusTable.alertClaimedAt),
                    lt(registrationStatusTable.alertClaimedAt, leaseCutoff)
                  )
                )
              )
            )
          )) as { rowCount?: number | null };

        if (claim.rowCount !== 1) {
          logger.info(
            { activity: reg.name, level: reg.level },
            "Waitlist promotion alert already claimed by another process/lease – skipping send"
          );
          continue;
        }

        const smsSent = await notifyWaitlistPromotion(reg.name, reg.level);
        promotions.push({ activityName: reg.name, level: reg.level, smsSent });
        logger.info(
          { activity: reg.name, level: reg.level, smsSent },
          "Waitlist promotion detected – Waitlisted → Registered"
        );

        try {
          if (smsSent) {
            // Delivery confirmed — clear pending state so it never re-fires.
            await db
              .update(registrationStatusTable)
              .set({ alertPending: false, alertClaimedAt: null, lastAlertAt: new Date(), updatedAt: new Date() })
              .where(eq(registrationStatusTable.id, existing.id));
          } else {
            // Known send failure — release the claim (keep alertPending) so
            // the next cycle retries immediately rather than after the lease.
            await db
              .update(registrationStatusTable)
              .set({ alertClaimedAt: null, updatedAt: new Date() })
              .where(eq(registrationStatusTable.id, existing.id));
          }
        } catch (persistErr) {
          // Twilio may have accepted the message but we failed to record it.
          // The active claim lease prevents any process (including this one)
          // from re-sending until the lease expires — bounded at-least-once.
          logger.error(
            { err: persistErr instanceof Error ? persistErr.message : String(persistErr) },
            "Failed to persist alert delivery state – claim lease prevents immediate duplicate"
          );
        }
        continue;
      }

      if (existing.status !== status) {
        await db
          .update(registrationStatusTable)
          .set({ status, updatedAt: new Date() })
          .where(eq(registrationStatusTable.id, existing.id));
      }
    }

    return { checked: result.registrations.length, promotions, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message }, "Waitlist watch cycle failed");
    return { checked: 0, promotions: [], error: message };
  } finally {
    isWatchingWaitlist = false;
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

  // Waitlist watcher — separate, slower loop (full Playwright scrape).
  runWaitlistWatchCycle().catch((err) => logger.error({ err }, "Initial waitlist watch failed"));
  waitlistIntervalHandle = setInterval(() => {
    runWaitlistWatchCycle().catch((err) => logger.error({ err }, "Waitlist watch failed"));
  }, WAITLIST_CHECK_INTERVAL_MS);
  waitlistIntervalHandle.unref?.();
}

export function stopScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info("Scheduler stopped");
  }
  if (waitlistIntervalHandle) {
    clearInterval(waitlistIntervalHandle);
    waitlistIntervalHandle = null;
  }
}

// ─── Status snapshot (for the API route) ─────────────────────────────────────

export function getSchedulerStatus(): {
  isRunning: boolean;
  isChecking: boolean;
  lastTickAt: Date | null;
  smsConfigured: boolean;
  lastWaitlistCheckAt: Date | null;
} {
  return {
    isRunning: intervalHandle !== null,
    isChecking,
    lastTickAt,
    smsConfigured: smsConfigured(),
    lastWaitlistCheckAt,
  };
}
