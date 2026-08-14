import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Last-known enrollment status per activity, persisted between scrapes so the
 * waitlist watcher can detect status transitions (Waitlisted → Registered)
 * across server restarts without sending duplicate alerts.
 */
export const registrationStatusTable = pgTable("registration_status", {
  id: serial("id").primaryKey(),
  /** Stable identity for an activity: "<name>|<level>" (level may be ""). */
  activityKey: text("activity_key").notNull().unique(),
  activityName: text("activity_name").notNull(),
  level: text("level"),
  /** Last observed status, e.g. "Waitlisted" | "Registered". */
  status: text("status").notNull(),
  /**
   * True when a Waitlisted → Registered promotion was detected but the SMS
   * alert could not be delivered — the watcher retries on subsequent cycles
   * until delivery succeeds, then clears the flag. This is what prevents both
   * missed alerts (send failure) and duplicate alerts (already delivered).
   */
  alertPending: boolean("alert_pending").notNull().default(false),
  /**
   * Claim timestamp for the promotion alert. Set atomically (conditional
   * UPDATE) before any SMS is attempted so that concurrent scheduler
   * processes cannot both send for the same transition. A claim is honoured
   * for a lease period; a crashed claimant's alert is retried only after the
   * lease expires. Cleared on confirmed delivery or a known send failure.
   */
  alertClaimedAt: timestamp("alert_claimed_at", { withTimezone: true }),
  /** When the promotion alert was last successfully delivered. */
  lastAlertAt: timestamp("last_alert_at", { withTimezone: true }),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRegistrationStatusSchema = createInsertSchema(registrationStatusTable).omit({
  id: true,
  firstSeenAt: true,
  updatedAt: true,
});

export type InsertRegistrationStatus = z.infer<typeof insertRegistrationStatusSchema>;
export type RegistrationStatus = typeof registrationStatusTable.$inferSelect;
