/**
 * Scheduler pre-window reminder tests.
 *
 * Covers:
 *  1. Reminder fires exactly once per window on successful delivery.
 *  2. Reminder fires again when the target's registration date changes.
 *  3. Reminder retries on the next tick when SMS delivery fails.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock external dependencies before importing the module under test ────────

// Mock DB — we only need the select chain used in runCheckCycle.
vi.mock("@workspace/db", () => {
  const mockWhere = vi.fn();
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  const db = { select: mockSelect, insert: vi.fn(() => ({ values: vi.fn() })), update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })) };
  return { db, activityTargetsTable: {}, bookingLogTable: {}, registrationStatusTable: {} };
});

// Mock SMS helpers — control delivery success per test.
vi.mock("./sms", () => ({
  smsConfigured: vi.fn(() => true),
  notifyWindowOpening: vi.fn(async () => true),
  notifyWindowEnded: vi.fn(async () => true),
  notifyBookingSuccess: vi.fn(async () => true),
  notifyScraperError: vi.fn(async () => true),
  notifyWaitlistPromotion: vi.fn(async () => true),
}));

// Mock scraper — should not be called for pre-window ticks.
vi.mock("./scraper", () => ({
  findAndBook: vi.fn(async () => ({ outcome: "no_spot", message: "No spots" })),
  readCurrentRegistrations: vi.fn(async () => ({
    registrations: [],
    scrapedAt: new Date(0).toISOString(),
    source: "live",
    error: null,
  })),
}));

// Mock logger — suppress noise.
vi.mock("./logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ─── Import after mocks are registered ───────────────────────────────────────

import { runCheckCycle, runWaitlistWatchCycle, _resetSchedulerStateForTest } from "./scheduler";
import { db } from "@workspace/db";
import { notifyWindowOpening, notifyWaitlistPromotion } from "./sms";
import { readCurrentRegistrations } from "./scraper";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal active target whose window starts at windowStart on regDate.
 * Vancouver (PDT = UTC-7) so 09:00 PT = 16:00 UTC.
 */
function makeTarget(overrides: Partial<{
  id: number;
  registrationDate: string;
  checkWindowStart: string;
  checkWindowEnd: string;
}> = {}) {
  return {
    id: 1,
    activityName: "Swimming",
    level: "Orca",
    status: "active",
    registrationDate: "2026-08-20",
    checkWindowStart: "09:00",
    checkWindowEnd: "11:00",
    lastCheckedAt: null,
    ...overrides,
  };
}

/**
 * Set the fake clock to a Vancouver local time on the given date.
 * Vancouver in August is PDT = UTC-7.
 */
function setVancouverTime(date: string, hour: number, minute: number): void {
  // PDT is UTC-7; add 7 hours to convert local → UTC
  const utcHour = hour + 7;
  vi.setSystemTime(new Date(`${date}T${String(utcHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`));
}

/** Wire the DB mock to return the given targets for the next select call. */
function mockTargets(targets: ReturnType<typeof makeTarget>[]) {
  // db.select().from().where() resolves to the targets array
  const mockWhere = vi.fn().mockResolvedValue(targets);
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Pre-window reminder", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    _resetSchedulerStateForTest();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends the reminder once when in the 30-minute pre-window zone", async () => {
    const target = makeTarget(); // window 09:00–11:00 on 2026-08-20
    mockTargets([target]);

    // 08:35 Vancouver — 25 minutes before 09:00
    setVancouverTime("2026-08-20", 8, 35);
    const [result] = await runCheckCycle();

    expect(notifyWindowOpening).toHaveBeenCalledOnce();
    expect(result?.smsSent).toBe(true);
    expect(result?.message).toMatch(/Reminder sent/);
  });

  it("does not send the reminder again on the next tick after successful delivery", async () => {
    const target = makeTarget();
    mockTargets([target]);

    // First tick at 08:35 — reminder fires
    setVancouverTime("2026-08-20", 8, 35);
    await runCheckCycle();
    expect(notifyWindowOpening).toHaveBeenCalledOnce();

    // Second tick at 08:40 — still in pre-window zone, same window key
    mockTargets([target]);
    setVancouverTime("2026-08-20", 8, 40);
    const [second] = await runCheckCycle();

    // notifyWindowOpening should NOT have been called a second time
    expect(notifyWindowOpening).toHaveBeenCalledOnce();
    expect(second?.smsSent).toBe(false);
  });

  it("fires a fresh reminder when the registration date is updated to a later date", async () => {
    const target = makeTarget({ registrationDate: "2026-08-20" });
    mockTargets([target]);

    // First window: reminder sent for 2026-08-20
    setVancouverTime("2026-08-20", 8, 35);
    await runCheckCycle();
    expect(notifyWindowOpening).toHaveBeenCalledOnce();

    // Target rescheduled to a week later — different registration date
    const rescheduled = makeTarget({ registrationDate: "2026-08-27" });
    mockTargets([rescheduled]);

    // Tick in the pre-window zone for the new date
    setVancouverTime("2026-08-27", 8, 35);
    const [result] = await runCheckCycle();

    // Window key changed → reminder fires again
    expect(notifyWindowOpening).toHaveBeenCalledTimes(2);
    expect(result?.smsSent).toBe(true);
  });

  it("retries the reminder on the next tick when SMS delivery fails", async () => {
    // First call fails, second succeeds
    const smsNotify = notifyWindowOpening as ReturnType<typeof vi.fn>;
    smsNotify
      .mockResolvedValueOnce(false)  // first tick: delivery failure
      .mockResolvedValueOnce(true);  // second tick: delivery succeeds

    const target = makeTarget();
    mockTargets([target]);

    // First tick — SMS fails
    setVancouverTime("2026-08-20", 8, 35);
    const [first] = await runCheckCycle();
    expect(first?.smsSent).toBe(false);
    expect(first?.message).toMatch(/failed/i);

    // Second tick — should retry because reminder was not recorded as sent
    mockTargets([target]);
    setVancouverTime("2026-08-20", 8, 36);
    const [second] = await runCheckCycle();
    expect(notifyWindowOpening).toHaveBeenCalledTimes(2);
    expect(second?.smsSent).toBe(true);
  });

  it("does not send the reminder more than 30 minutes before the window", async () => {
    const target = makeTarget(); // window starts at 09:00
    mockTargets([target]);

    // 07:00 — 120 minutes before window; outside the 30-min zone
    setVancouverTime("2026-08-20", 7, 0);
    const [result] = await runCheckCycle();

    expect(notifyWindowOpening).not.toHaveBeenCalled();
    expect(result?.smsSent).toBe(false);
    expect(result?.message).toMatch(/Before check window/);
  });

  it("does not send a reminder if the target is skipped (wrong date)", async () => {
    const target = makeTarget({ registrationDate: "2026-08-20" });
    mockTargets([target]);

    // Different date entirely
    setVancouverTime("2026-08-19", 8, 35);
    const [result] = await runCheckCycle();

    expect(notifyWindowOpening).not.toHaveBeenCalled();
    expect(result?.message).toMatch(/Not registration day/);
  });
});

// ─── Waitlist watcher tests ───────────────────────────────────────────────────

function makeScrapeResult(regs: Array<{ name: string; level?: string | null; status: string }>) {
  return {
    registrations: regs.map((r) => ({
      name: r.name,
      level: r.level ?? null,
      dates: null,
      times: null,
      location: null,
      status: r.status,
    })),
    scrapedAt: "2026-08-14T00:00:00.000Z",
    source: "live" as const,
    error: null,
  };
}

/**
 * Wire the DB mock: select→rows for registration_status, spy insert/update.
 * Each update's `where` resolves to the next entry of `updateResults`
 * (default rowCount 1 = claim succeeds / persist succeeds).
 */
function mockStatusDb(
  rows: Array<Record<string, unknown>>,
  updateResults: Array<{ rowCount: number } | Error> = []
) {
  const mockWhere = vi.fn().mockResolvedValue(rows);
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });
  const valuesSpy = vi.fn();
  (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: valuesSpy });
  let call = 0;
  const setSpy = vi.fn(() => ({
    where: vi.fn(() => {
      const r = updateResults[call++] ?? { rowCount: 1 };
      return r instanceof Error ? Promise.reject(r) : Promise.resolve(r);
    }),
  }));
  (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: setSpy });
  return { valuesSpy, setSpy };
}

describe("Waitlist watcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records a baseline without alerting on first sighting", async () => {
    (readCurrentRegistrations as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeScrapeResult([{ name: "Preschool 3: Orca", level: "#115345", status: "Waitlisted" }])
    );
    const { valuesSpy } = mockStatusDb([]); // no existing row

    const result = await runWaitlistWatchCycle();

    expect(notifyWaitlistPromotion).not.toHaveBeenCalled();
    expect(valuesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: "Waitlisted", activityKey: "Preschool 3: Orca|#115345" })
    );
    expect(result?.promotions).toHaveLength(0);
  });

  it("sends an SMS when status flips Waitlisted → Registered", async () => {
    (readCurrentRegistrations as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeScrapeResult([{ name: "Preschool 3: Orca", level: "#115345", status: "Registered" }])
    );
    const { setSpy } = mockStatusDb([
      { id: 1, activityKey: "Preschool 3: Orca|#115345", status: "Waitlisted", alertPending: false },
    ]);

    const result = await runWaitlistWatchCycle();

    expect(notifyWaitlistPromotion).toHaveBeenCalledWith("Preschool 3: Orca", "#115345");
    expect(result?.promotions).toEqual([
      { activityName: "Preschool 3: Orca", level: "#115345", smsSent: true },
    ]);
    // First update = atomic claim BEFORE sending; second clears pending state.
    expect(setSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ status: "Registered", alertPending: true, alertClaimedAt: expect.any(Date) })
    );
    expect(setSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ alertPending: false, alertClaimedAt: null, lastAlertAt: expect.any(Date) })
    );
    // Claim must happen before the SMS is sent.
    expect(setSpy.mock.invocationCallOrder[0]).toBeLessThan(
      (notifyWaitlistPromotion as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]!
    );
  });

  it("does not send when another process already claimed the alert (concurrent cycle)", async () => {
    (readCurrentRegistrations as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeScrapeResult([{ name: "Preschool 3: Orca", level: "#115345", status: "Registered" }])
    );
    // Both processes read the same stale row, but this one loses the
    // conditional-update race: claim affects 0 rows.
    mockStatusDb(
      [{ id: 1, activityKey: "Preschool 3: Orca|#115345", status: "Waitlisted", alertPending: false }],
      [{ rowCount: 0 }]
    );

    const result = await runWaitlistWatchCycle();

    expect(notifyWaitlistPromotion).not.toHaveBeenCalled();
    expect(result?.promotions).toHaveLength(0);
  });

  it("does not resend within the claim lease when persisting delivery state fails after a successful send", async () => {
    (readCurrentRegistrations as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeScrapeResult([{ name: "Preschool 3: Orca", level: "#115345", status: "Registered" }])
    );
    // Cycle 1: claim succeeds, SMS sent, but persisting delivery state throws.
    mockStatusDb(
      [{ id: 1, activityKey: "Preschool 3: Orca|#115345", status: "Waitlisted", alertPending: false }],
      [{ rowCount: 1 }, new Error("db connection lost")]
    );
    const first = await runWaitlistWatchCycle();
    expect(notifyWaitlistPromotion).toHaveBeenCalledTimes(1);
    expect(first?.error).toBeNull(); // persistence failure is contained

    // Cycle 2 (within the lease): row still shows alertPending with a fresh
    // claim, so the conditional claim update matches 0 rows → no resend.
    mockStatusDb(
      [{ id: 1, activityKey: "Preschool 3: Orca|#115345", status: "Registered", alertPending: true, alertClaimedAt: new Date() }],
      [{ rowCount: 0 }]
    );
    await runWaitlistWatchCycle();
    expect(notifyWaitlistPromotion).toHaveBeenCalledTimes(1); // still just one send
  });

  it("does not alert again once the status is already Registered", async () => {
    (readCurrentRegistrations as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeScrapeResult([{ name: "Preschool 3: Orca", level: "#115345", status: "Registered" }])
    );
    mockStatusDb([
      { id: 1, activityKey: "Preschool 3: Orca|#115345", status: "Registered", alertPending: false },
    ]);

    const result = await runWaitlistWatchCycle();

    expect(notifyWaitlistPromotion).not.toHaveBeenCalled();
    expect(result?.promotions).toHaveLength(0);
  });

  it("retries the alert on the next cycle when SMS delivery fails", async () => {
    (readCurrentRegistrations as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeScrapeResult([{ name: "Preschool 3: Orca", level: "#115345", status: "Registered" }])
    );
    (notifyWaitlistPromotion as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    // Cycle 1: transition detected, claim taken, SMS fails → claim released
    // (alertClaimedAt: null) while alertPending stays true in the claim row.
    const { setSpy } = mockStatusDb([
      { id: 1, activityKey: "Preschool 3: Orca|#115345", status: "Waitlisted", alertPending: false },
    ]);
    await runWaitlistWatchCycle();
    expect(setSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ status: "Registered", alertPending: true })
    );
    expect(setSpy).toHaveBeenNthCalledWith(2, expect.objectContaining({ alertClaimedAt: null }));

    // Cycle 2: alertPending with released claim → re-claim succeeds, retry succeeds
    const { setSpy: setSpy2 } = mockStatusDb([
      { id: 1, activityKey: "Preschool 3: Orca|#115345", status: "Registered", alertPending: true, alertClaimedAt: null },
    ]);
    const result = await runWaitlistWatchCycle();
    expect(notifyWaitlistPromotion).toHaveBeenCalledTimes(2);
    expect(result?.promotions?.[0]?.smsSent).toBe(true);
    expect(setSpy2).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ alertPending: false, alertClaimedAt: null })
    );
  });

  it("leaves statuses untouched when the scrape reports an error", async () => {
    (readCurrentRegistrations as ReturnType<typeof vi.fn>).mockResolvedValue({
      registrations: [],
      scrapedAt: "2026-08-14T00:00:00.000Z",
      source: "live" as const,
      error: "Authentication/browser failure: boom",
    });
    const { valuesSpy, setSpy } = mockStatusDb([]);

    const result = await runWaitlistWatchCycle();

    expect(result?.error).toMatch(/failure/);
    expect(valuesSpy).not.toHaveBeenCalled();
    expect(setSpy).not.toHaveBeenCalled();
    expect(notifyWaitlistPromotion).not.toHaveBeenCalled();
  });
});
