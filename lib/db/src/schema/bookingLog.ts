import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bookingLogTable = pgTable("booking_log", {
  id: serial("id").primaryKey(),
  targetId: serial("target_id"),
  activityName: text("activity_name").notNull(),
  level: text("level").notNull(),
  outcome: text("outcome").notNull(), // success | failed | no_spot | scraper_error | window_closed
  confirmationNumber: text("confirmation_number"),
  classDate: text("class_date"),
  classTime: text("class_time"),
  notes: text("notes"),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBookingLogSchema = createInsertSchema(bookingLogTable).omit({
  id: true,
  attemptedAt: true,
});

export type InsertBookingLog = z.infer<typeof insertBookingLogSchema>;
export type BookingLog = typeof bookingLogTable.$inferSelect;
