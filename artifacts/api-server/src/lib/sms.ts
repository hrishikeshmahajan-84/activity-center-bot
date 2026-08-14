/**
 * Twilio notification helper — supports both SMS and WhatsApp sandbox.
 *
 * Required secrets:
 *   TWILIO_ACCOUNT_SID   – Twilio account SID
 *   TWILIO_AUTH_TOKEN    – Twilio auth token
 *   TWILIO_FROM_NUMBER   – Twilio "From" phone number (E.164, e.g. +12223334444)
 *                          (ignored in WhatsApp mode; sandbox number used instead)
 *   NOTIFY_PHONE_NUMBER  – Recipient phone number (E.164, e.g. +16047859680)
 *
 * Optional:
 *   TWILIO_USE_WHATSAPP  – Set to "true" to send via the Twilio WhatsApp sandbox
 *                          instead of SMS. The recipient must first opt in by
 *                          sending "join <keyword>" to whatsapp:+14155238886.
 *   TWILIO_TRIAL_ACCOUNT – Set to "true" when using a Twilio trial SMS account.
 *
 * All functions degrade gracefully when Twilio is not configured – they log a
 * warning instead of throwing, so missing credentials never crash the scheduler.
 */

import twilio from "twilio";
import { logger } from "./logger";

/** Required prefix for every outbound message on a Twilio trial SMS account. */
const TRIAL_PREFIX = "Sent from your Twilio trial account - ";

/** Twilio error codes that indicate a trial-account template restriction. */
const TRIAL_ERROR_CODES = new Set([21608, 572006]);

/** Twilio WhatsApp sandbox number (shared across all trial accounts). */
const WHATSAPP_SANDBOX_FROM = "whatsapp:+14155238886";

export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.NOTIFY_PHONE_NUMBER
  );
}

/** Returns true when WhatsApp sandbox mode is enabled. */
function isWhatsApp(): boolean {
  return process.env.TWILIO_USE_WHATSAPP?.toLowerCase() === "true";
}

/** Returns true when the env var explicitly signals a trial SMS account. */
function isTrialAccount(): boolean {
  return process.env.TWILIO_TRIAL_ACCOUNT?.toLowerCase() === "true";
}

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
 * Send a notification to the configured recipient.
 *
 * When TWILIO_USE_WHATSAPP=true the message is delivered via the Twilio
 * WhatsApp sandbox — no trial prefix needed, no paid plan required.
 * The recipient must have already opted in by sending "join <keyword>" to
 * +14155238886 on WhatsApp.
 *
 * When TWILIO_USE_WHATSAPP is unset/false, regular SMS is used and the
 * trial prefix is applied automatically when needed.
 *
 * Returns true on success, false on failure (error is logged, not thrown).
 */
export async function sendSms(body: string): Promise<boolean> {
  if (!smsConfigured()) {
    logger.warn({ body }, "Notification not sent – Twilio credentials not configured");
    return false;
  }

  if (isWhatsApp()) {
    // ── WhatsApp sandbox path ────────────────────────────────────────────────
    const to = `whatsapp:${process.env.NOTIFY_PHONE_NUMBER!}`;
    try {
      const client = getClient();
      const msg = await client.messages.create({
        from: WHATSAPP_SANDBOX_FROM,
        to,
        body,
      });
      logger.info({ sid: msg.sid, to }, "WhatsApp message sent");
      return true;
    } catch (err) {
      logger.error({ err }, "Failed to send WhatsApp message");
      return false;
    }
  }

  // ── Regular SMS path ───────────────────────────────────────────────────────
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
  const windowStart = target.checkWindowStart ?? "09:50";
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
  const windowEnd = target.checkWindowEnd ?? "10:10";
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

/** Sent when a waitlisted activity flips to enrolled (off the waitlist!). */
export async function notifyWaitlistPromotion(
  activityName: string,
  level: string | null
): Promise<boolean> {
  const label = level ? `${activityName} – ${level}` : activityName;
  return sendSms(
    `🎉 Off the waitlist! Agastya is now ENROLLED in ${label}. ` +
      `Check the app for class details.`
  );
}

/** Optional startup confirmation SMS (dev only). */
export async function sendStartupPing(): Promise<void> {
  if (!smsConfigured()) return;
  if (process.env.NODE_ENV !== "development") return;
  await sendSms("📡 Burnaby Activities scheduler is online and watching.");
}
