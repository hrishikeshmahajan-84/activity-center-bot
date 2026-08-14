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
  return { db, activityTargetsTable: {}, bookingLogTable: {} };
});

// Mock SMS helpers — control delivery success per test.
vi.mock("./sms", () => ({
  smsConfigured: vi.fn(() => true),
  notifyWindowOpening: vi.fn(async () => true),
  notifyWindowEnded: vi.fn(async () => true),
  notifyBookingSuccess: vi.fn(async () => true),
  notifyScraperError: vi.fn(async () => true),
}));

// Mock scraper — should not be called for pre-window ticks.
vi.mock("./scraper", () => ({
  findAndBook: vi.fn(async () => ({ outcome: "no_spot", message: "No spots" })),
}));

// Mock logger — suppress noise.
vi.mock("./logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ─── Import after mocks are registered ───────────────────────────────────────

import { runCheckCycle, _resetSchedulerStateForTest } from "./scheduler";
import { db } from "@workspace/db";
import { notifyWindowOpening } from "./sms";

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
