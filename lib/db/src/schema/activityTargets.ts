import { pgTable, text, serial, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activityTargetsTable = pgTable("activity_targets", {
  id: serial("id").primaryKey(),
  activityName: text("activity_name").notNull(),
  level: text("level").notNull(),
  registrationDate: date("registration_date", { mode: "string" }),
  checkWindowStart: text("check_window_start").default("09:00"),
  checkWindowEnd: text("check_window_end").default("11:00"),
  /**
   * Day of week the class runs, e.g. "Wednesday". Used by the scraper to pick
   * the correct session when multiple sessions share the same level.
   */
  classDay: text("class_day"),
  /**
   * Time the class runs, e.g. "6:00 PM". Used alongside classDay to identify
   * the exact session to book.
   */
  classTime: text("class_time"),
  notes: text("notes"),
  status: text("status").notNull().default("active"), // active | booked | cancelled
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  /**
   * Window key for which a pre-window reminder SMS was successfully sent,
   * formatted as "<registrationDate>:<windowStart>" (e.g. "2026-09-06:09:00").
   * Persisted so a server restart during the 30-minute pre-window zone does
   * not cause a duplicate reminder. Null means no reminder has been sent yet.
   */
  reminderSentForWindow: text("reminder_sent_for_window"),
});

export const insertActivityTargetSchema = createInsertSchema(activityTargetsTable).omit({
  id: true,
  createdAt: true,
  lastCheckedAt: true,
});

export type InsertActivityTarget = z.infer<typeof insertActivityTargetSchema>;
export type ActivityTarget = typeof activityTargetsTable.$inferSelect;
