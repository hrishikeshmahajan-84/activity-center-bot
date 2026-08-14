import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, activityTargetsTable } from "@workspace/db";
import {
  ListTargetsResponse,
  GetTargetParams,
  GetTargetResponse,
  CreateTargetBody,
  CreateTargetResponse,
  UpdateTargetParams,
  UpdateTargetBody,
  UpdateTargetResponse,
  DeleteTargetParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/targets", async (req, res): Promise<void> => {
  const targets = await db
    .select()
    .from(activityTargetsTable)
    .orderBy(activityTargetsTable.createdAt);
  res.json(ListTargetsResponse.parse(targets));
});

router.post("/targets", async (req, res): Promise<void> => {
  const parsed = CreateTargetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const [target] = await db
    .insert(activityTargetsTable)
    .values({
      activityName: data.activityName,
      level: data.level,
      registrationDate: data.registrationDate ?? null,
      checkWindowStart: data.checkWindowStart ?? "09:00",
      checkWindowEnd: data.checkWindowEnd ?? "11:00",
      notes: data.notes ?? null,
      status: "active",
    })
    .returning();

  res.status(201).json(CreateTargetResponse.parse(target));
});

router.get("/targets/:id", async (req, res): Promise<void> => {
  const params = GetTargetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [target] = await db
    .select()
    .from(activityTargetsTable)
    .where(eq(activityTargetsTable.id, params.data.id));

  if (!target) {
    res.status(404).json({ error: "Target not found" });
    return;
  }

  res.json(GetTargetResponse.parse(target));
});

router.patch("/targets/:id", async (req, res): Promise<void> => {
  const params = UpdateTargetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTargetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const updateData: Partial<typeof activityTargetsTable.$inferInsert> = {};
  if (data.activityName !== undefined) updateData.activityName = data.activityName;
  if (data.level !== undefined) updateData.level = data.level;
  if ("registrationDate" in data) updateData.registrationDate = data.registrationDate ?? null;
  if ("checkWindowStart" in data) updateData.checkWindowStart = data.checkWindowStart ?? "09:00";
  if ("checkWindowEnd" in data) updateData.checkWindowEnd = data.checkWindowEnd ?? "11:00";
  if ("notes" in data) updateData.notes = data.notes ?? null;
  if (data.status !== undefined) updateData.status = data.status;

  const [target] = await db
    .update(activityTargetsTable)
    .set(updateData)
    .where(eq(activityTargetsTable.id, params.data.id))
    .returning();

  if (!target) {
    res.status(404).json({ error: "Target not found" });
    return;
  }

  res.json(UpdateTargetResponse.parse(target));
});

router.delete("/targets/:id", async (req, res): Promise<void> => {
  const params = DeleteTargetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(activityTargetsTable)
    .where(eq(activityTargetsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Target not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
