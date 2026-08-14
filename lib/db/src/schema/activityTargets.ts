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
  notes: text("notes"),
  status: text("status").notNull().default("active"), // active | booked | cancelled
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivityTargetSchema = createInsertSchema(activityTargetsTable).omit({
  id: true,
  createdAt: true,
  lastCheckedAt: true,
});

export type InsertActivityTarget = z.infer<typeof insertActivityTargetSchema>;
export type ActivityTarget = typeof activityTargetsTable.$inferSelect;
