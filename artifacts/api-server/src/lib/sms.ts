/**
 * Twilio SMS notification helper.
 *
 * Required secrets:
 *   TWILIO_ACCOUNT_SID   – Twilio account SID
 *   TWILIO_AUTH_TOKEN    – Twilio auth token
 *   TWILIO_FROM_NUMBER   – Twilio "From" phone number (E.164, e.g. +12223334444)
 *   NOTIFY_PHONE_NUMBER  – Recipient phone number (E.164, e.g. +16047859680)
 *
 * Optional:
 *   TWILIO_TRIAL_ACCOUNT – Set to "true" when using a Twilio trial account.
 *                          Trial accounts require the prefix
 *                          "Sent from your Twilio trial account - " on every
 *                          outbound message. If this env var is not set, the
 *                          helper will auto-detect trial mode when Twilio
 *                          returns error code 21608/572006 and retry once with
 *                          the prefix.
 *
 * All functions degrade gracefully when Twilio is not configured – they log a
 * warning instead of throwing, so missing credentials never crash the scheduler.
 */

import twilio from "twilio";
import { logger } from "./logger";

/** Required prefix for every outbound message on a Twilio trial account. */
const TRIAL_PREFIX = "Sent from your Twilio trial account - ";

/** Twilio error codes that indicate a trial-account template restriction. */
const TRIAL_ERROR_CODES = new Set([21608, 572006]);

export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER &&
      process.env.NOTIFY_PHONE_NUMBER
  );
}

/** Returns true when the env var explicitly signals a trial account. */
function isTrialAccount(): boolean {
  return process.env.TWILIO_TRIAL_ACCOUNT?.toLowerCase() === "true";
}

/**
 * Prepend the trial prefix if it isn't already present.
 * Safe to call on messages that were already prefixed.
 */
function applyTrialPrefix(body: string): string {
  return body.startsWith(TRIAL_PREFIX) ? body : TRIAL_PREFIX + body;
}

function getClient(): ReturnType<typeof twilio> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("Twilio credentials not configured");
  return twilio(sid, token);
}

/**
 * Send a raw SMS to the configured recipient number.
 *
 * When TWILIO_TRIAL_ACCOUNT=true (or auto-detected via error code), the
 * required trial prefix is prepended automatically.
 *
 * Returns true on success, false on failure (error is logged, not thrown).
 */
export async function sendSms(body: string): Promise<boolean> {
  if (!smsConfigured()) {
    logger.warn({ body }, "SMS not sent – Twilio credentials not configured");
    return false;
  }

  // Apply trial prefix upfront when the account is explicitly flagged.
  if (isTrialAccount() && process.env.NODE_ENV === "production") {
    logger.warn(
      "TWILIO_TRIAL_ACCOUNT=true is set in production – outbound messages will " +
        "include the trial prefix. If you have upgraded to a paid Twilio account, " +
        "delete the TWILIO_TRIAL_ACCOUNT secret to remove the prefix."
    );
  }
  const outboundBody = isTrialAccount() ? applyTrialPrefix(body) : body;

  try {
    const client = getClient();
    const msg = await client.messages.create({
      from: process.env.TWILIO_FROM_NUMBER!,
      to: process.env.NOTIFY_PHONE_NUMBER!,
      body: outboundBody,
    });
    logger.info({ sid: msg.sid, to: process.env.NOTIFY_PHONE_NUMBER }, "SMS sent");
    return true;
  } catch (err: unknown) {
    // Auto-detect trial account: if Twilio rejects with a trial template error,
    // retry once with the required prefix (and log a hint to set the env var).
    const code = (err as { code?: number })?.code;
    if (TRIAL_ERROR_CODES.has(code!) && !isTrialAccount()) {
      logger.warn(
        { code },
        "Twilio trial-account error detected – retrying with trial prefix. " +
          "Set TWILIO_TRIAL_ACCOUNT=true to skip this retry on future messages."
      );
      try {
        const client = getClient();
        const msg = await client.messages.create({
          from: process.env.TWILIO_FROM_NUMBER!,
          to: process.env.NOTIFY_PHONE_NUMBER!,
          body: applyTrialPrefix(body),
        });
        logger.info(
          { sid: msg.sid, to: process.env.NOTIFY_PHONE_NUMBER },
          "SMS sent (trial prefix applied automatically)"
        );
        return true;
      } catch (retryErr) {
        logger.error({ err: retryErr }, "Failed to send SMS even with trial prefix");
        return false;
      }
    }

    logger.error({ err }, "Failed to send SMS");
    return false;
  }
}

// ─── Typed notification helpers ───────────────────────────────────────────────

interface TargetInfo {
  activityName: string;
  level: string;
  checkWindowStart?: string | null;
  checkWindowEnd?: string | null;
}

interface BookingResult {
  confirmationNumber?: string | null;
  classDate?: string | null;
  classTime?: string | null;
}

/** Sent when a booking completes successfully. */
export async function notifyBookingSuccess(
  target: TargetInfo,
  result: BookingResult
): Promise<boolean> {
  const parts = [`✅ Booked! ${target.activityName} – ${target.level}`];
  if (result.classDate) parts.push(result.classDate);
  if (result.classTime) parts.push(result.classTime);
  if (result.confirmationNumber) parts.push(`Confirmation #${result.confirmationNumber}`);
  return sendSms(parts.join(" – "));
}

/** Sent 30 minutes before the check window opens, as a manual-backup heads-up. */
export async function notifyWindowOpening(target: TargetInfo): Promise<boolean> {
  const windowStart = target.checkWindowStart ?? "09:00";
  // Format "HH:MM" → "9:00am" / "2:30pm" style
  const [hStr, mStr] = windowStart.split(":");
  const h = parseInt(hStr ?? "9", 10);
  const m = parseInt(mStr ?? "0", 10);
  const period = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mPad = m === 0 ? "00" : String(m).padStart(2, "0");
  const timeLabel = `${h12}:${mPad}${period}`;
  return sendSms(
    `⏰ Reminder: Registration window for ${target.activityName} – ${target.level} ` +
      `opens in 30 minutes (${timeLabel} PT). Get ready!`
  );
}

/** Sent once when the check window closes without a successful booking. */
export async function notifyWindowEnded(target: TargetInfo): Promise<boolean> {
  const windowEnd = target.checkWindowEnd ?? "11:00";
  return sendSms(
    `⚠️ No booking made for ${target.activityName} – ${target.level}. ` +
      `Registration window ended at ${windowEnd} PT. Check the app for details.`
  );
}

/** Sent immediately when a login or scraper error occurs mid-window. */
export async function notifyScraperError(
  target: TargetInfo,
  reason: string
): Promise<boolean> {
  return sendSms(
    `🚨 Booking check failed for ${target.activityName} – ${target.level}: ` +
      `${reason.slice(0, 120)}. Please check manually.`
  );
}

/** Optional startup confirmation SMS (dev only). */
export async function sendStartupPing(): Promise<void> {
  if (!smsConfigured()) return;
  if (process.env.NODE_ENV !== "development") return;
  await sendSms("📡 Burnaby Activities scheduler is online and watching.");
}
