import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, bookingLogTable } from "@workspace/db";
import {
  ListBookingsQueryParams,
  ListBookingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/bookings", async (req, res): Promise<void> => {
  const parsed = ListBookingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { targetId, limit = 50 } = parsed.data;

  let query = db
    .select()
    .from(bookingLogTable)
    .orderBy(desc(bookingLogTable.attemptedAt))
    .limit(Number(limit));

  if (targetId !== undefined) {
    const entries = await db
      .select()
      .from(bookingLogTable)
      .where(eq(bookingLogTable.targetId, Number(targetId)))
      .orderBy(desc(bookingLogTable.attemptedAt))
      .limit(Number(limit));
    res.json(ListBookingsResponse.parse(entries));
    return;
  }

  const entries = await query;
  res.json(ListBookingsResponse.parse(entries));
});

export default router;
