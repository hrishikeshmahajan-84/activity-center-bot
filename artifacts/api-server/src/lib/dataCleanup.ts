/**
 * One-time startup data cleanup.
 *
 * The production database still contains junk targets left over from early
 * testing ("Test" / "SmokeTest") and a stale registration date on the
 * Ice Skating / Gliders 2 target. Production data can't be edited from the
 * development workspace, so this reconciliation runs once at server startup.
 * It is idempotent and a no-op when the data is already correct (as in dev).
 */
import { eq, inArray, sql } from "drizzle-orm";
import { db, activityTargetsTable, bookingLogTable } from "@workspace/db";
import { logger } from "./logger";

const JUNK_TARGET_NAMES = ["Test", "SmokeTest"];
const GLIDERS2_REGISTRATION_DATE = "2026-08-15";

export async function runStartupDataCleanup(): Promise<void> {
  // 0. Idempotent schema migration — add new columns if missing (safe for prod).
  try {
    await db.execute(sql`
      ALTER TABLE activity_targets
        ADD COLUMN IF NOT EXISTS class_day  TEXT,
        ADD COLUMN IF NOT EXISTS class_time TEXT
    `);
    logger.info("Startup cleanup: class_day/class_time columns ensured");
  } catch (e) {
    logger.warn({ err: e }, "Startup cleanup: could not apply schema migration (non-fatal)");
  }
  // 1. Remove junk test targets (and their booking-log rows).
  const junk = await db
    .select({ id: activityTargetsTable.id, name: activityTargetsTable.activityName })
    .from(activityTargetsTable)
    .where(inArray(activityTargetsTable.activityName, JUNK_TARGET_NAMES));

  if (junk.length > 0) {
    const ids = junk.map((t) => t.id);
    await db.delete(bookingLogTable).where(inArray(bookingLogTable.targetId, ids));
    await db.delete(activityTargetsTable).where(inArray(activityTargetsTable.id, ids));
    logger.info({ removed: junk }, "Startup cleanup: removed junk test targets");
  }

  // 2. Fix a stale registration date on the Ice Skating / Gliders 2 target.
  const skating = await db
    .select()
    .from(activityTargetsTable)
    .where(eq(activityTargetsTable.level, "Gliders 2"));

  for (const target of skating) {
    if (
      target.activityName === "Ice Skating" &&
      target.registrationDate !== GLIDERS2_REGISTRATION_DATE
    ) {
      await db
        .update(activityTargetsTable)
        .set({ registrationDate: GLIDERS2_REGISTRATION_DATE })
        .where(eq(activityTargetsTable.id, target.id));
      logger.info(
        { targetId: target.id, from: target.registrationDate, to: GLIDERS2_REGISTRATION_DATE },
        "Startup cleanup: corrected Gliders 2 registration date"
      );
    }
  }
}
