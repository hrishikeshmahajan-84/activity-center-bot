/**
 * Notification helper — prefers Telegram when configured, falls back to Twilio SMS.
 *
 * Telegram (preferred — free, no trial restrictions):
 *   TELEGRAM_BOT_TOKEN  – Bot token from @BotFather
 *   TELEGRAM_CHAT_ID    – Your personal chat ID (send the bot any message,
 *                         then GET /getUpdates to find it)
 *
 * Twilio SMS (fallback):
 *   TWILIO_ACCOUNT_SID   – Twilio account SID
 *   TWILIO_AUTH_TOKEN    – Twilio auth token
 *   TWILIO_FROM_NUMBER   – Twilio "From" phone number (E.164)
 *   NOTIFY_PHONE_NUMBER  – Recipient phone number (E.164)
 *   TWILIO_TRIAL_ACCOUNT – Set to "true" on a trial account (prefix applied automatically)
 *
 * All functions degrade gracefully when nothing is configured.
 */

import twilio from "twilio";
import { logger } from "./logger";

// ─── Telegram ─────────────────────────────────────────────────────────────────

function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const chatId = process.env.TELEGRAM_CHAT_ID!;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      logger.error({ description: data.description }, "Telegram sendMessage failed");
      return false;
    }
    logger.info({ chatId }, "Telegram message sent");
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to send Telegram message");
    return false;
  }
}

/** Required prefix for every outbound message on a Twilio trial SMS account. */
const TRIAL_PREFIX = "Sent from your Twilio trial account - ";

/** Twilio error codes that indicate a trial-account template restriction. */
const TRIAL_ERROR_CODES = new Set([21608, 572006]);


export function smsConfigured(): boolean {
  return (
    telegramConfigured() ||
    Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.NOTIFY_PHONE_NUMBER
    )
  );
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
 * Prefers Telegram when TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID are set.
 * Falls back to Twilio SMS (with automatic trial-prefix handling).
 *
 * Returns true on success, false on failure (error is logged, not thrown).
 */
export async function sendSms(body: string): Promise<boolean> {
  if (!smsConfigured()) {
    logger.warn({ body }, "Notification not sent – no notification channel configured");
    return false;
  }

  // ── Telegram path (preferred) ──────────────────────────────────────────────
  if (telegramConfigured()) {
    return sendTelegram(body);
  }

  // ── Twilio SMS fallback ────────────────────────────────────────────────────
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
