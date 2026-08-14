/**
 * Twilio SMS notification helper.
 *
 * Required secrets:
 *   TWILIO_ACCOUNT_SID   – Twilio account SID
 *   TWILIO_AUTH_TOKEN    – Twilio auth token
 *   TWILIO_FROM_NUMBER   – Twilio "From" phone number (E.164, e.g. +12223334444)
 *   NOTIFY_PHONE_NUMBER  – Recipient phone number (E.164, e.g. +16047859680)
 *
 * All functions degrade gracefully when Twilio is not configured – they log a
 * warning instead of throwing, so missing credentials never crash the scheduler.
 */

import twilio from "twilio";
import { logger } from "./logger";

export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER &&
      process.env.NOTIFY_PHONE_NUMBER
  );
}

function getClient(): ReturnType<typeof twilio> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("Twilio credentials not configured");
  return twilio(sid, token);
}

/**
 * Send a raw SMS to the configured recipient number.
 * Returns true on success, false on failure (error is logged, not thrown).
 */
export async function sendSms(body: string): Promise<boolean> {
  if (!smsConfigured()) {
    logger.warn({ body }, "SMS not sent – Twilio credentials not configured");
    return false;
  }

  try {
    const client = getClient();
    const msg = await client.messages.create({
      from: process.env.TWILIO_FROM_NUMBER!,
      to: process.env.NOTIFY_PHONE_NUMBER!,
      body,
    });
    logger.info({ sid: msg.sid, to: process.env.NOTIFY_PHONE_NUMBER }, "SMS sent");
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to send SMS");
    return false;
  }
}

// ─── Typed notification helpers ───────────────────────────────────────────────

interface TargetInfo {
  activityName: string;
  level: string;
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
