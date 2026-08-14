import { Router, type IRouter } from "express";
import { db, activityTargetsTable } from "@workspace/db";
import {
  GetSchedulerStatusResponse,
  TriggerSchedulerResponse,
} from "@workspace/api-zod";
import { requireApiKey } from "../middleware/apiKey";

const router: IRouter = Router();

router.get("/scheduler/status", async (_req, res): Promise<void> => {
  const targets = await db.select().from(activityTargetsTable);

  const now = new Date();

  const targetStatuses = targets.map((t) => {
    let schedulerState: "waiting" | "active_window" | "booked" | "cancelled" = "waiting";
    if (t.status === "booked") schedulerState = "booked";
    else if (t.status === "cancelled") schedulerState = "cancelled";

    // Compute next check if registrationDate is set
    let nextCheckAt: string | null = null;
    if (t.registrationDate && t.status === "active") {
      const regDate = new Date(t.registrationDate + "T" + (t.checkWindowStart ?? "09:00") + ":00-07:00");
      if (regDate > now) {
        nextCheckAt = regDate.toISOString();
      }
    }

    return {
      targetId: t.id,
      activityName: t.activityName,
      level: t.level,
      registrationDate: t.registrationDate ?? null,
      checkWindowStart: t.checkWindowStart ?? null,
      checkWindowEnd: t.checkWindowEnd ?? null,
      schedulerState,
      nextCheckAt,
      lastCheckedAt: t.lastCheckedAt ? t.lastCheckedAt.toISOString() : null,
    };
  });

  res.json(
    GetSchedulerStatusResponse.parse({
      isRunning: false, // Real scheduler implemented in Task 3
      targets: targetStatuses,
      checkedAt: now.toISOString(),
    })
  );
});

router.post("/scheduler/trigger", async (_req, res): Promise<void> => {
  // Stub: real scheduler trigger wired in Task 3
  res.json(
    TriggerSchedulerResponse.parse({
      triggered: false,
      message: "Scheduler not yet configured. This will be available after Task 3 is complete.",
      targetsChecked: 0,
    })
  );
});

export default router;
