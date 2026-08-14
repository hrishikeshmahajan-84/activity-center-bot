import { useListTargets, useListBookings, useGetCurrentRegistrations, useGetSchedulerStatus, useTriggerScrape, useTriggerScheduler, getGetCurrentRegistrationsQueryKey, getGetSchedulerStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Play } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ActivityIllustration } from "@/components/activity-illustration";

/** Pick an emoji based on activity name */
function activityEmoji(name: string): string {
  const n = (name ?? "").toLowerCase();
  if (n.includes("swim")) return "🏊";
  if (n.includes("skat") || n.includes("ice")) return "⛸️";
  if (n.includes("gym")) return "🤸";
  if (n.includes("danc")) return "💃";
  if (n.includes("art") || n.includes("craft")) return "🎨";
  if (n.includes("soccer") || n.includes("football")) return "⚽";
  if (n.includes("basket")) return "🏀";
  if (n.includes("tennis")) return "🎾";
  if (n.includes("hockey")) return "🏒";
  return "🎯";
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active:        { label: "👀 Watching",   cls: "bg-amber-100 text-amber-700 border-amber-200" },
    active_window: { label: "🔍 Checking!",  cls: "bg-blue-100 text-blue-700 border-blue-200" },
    booked:        { label: "🎉 Booked!",    cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    success:       { label: "🎉 Booked!",    cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    cancelled:     { label: "💤 Stopped",    cls: "bg-gray-100 text-gray-500 border-gray-200" },
    failed:        { label: "⚠️ Error",      cls: "bg-red-100 text-red-600 border-red-200" },
    scraper_error: { label: "⚠️ Error",      cls: "bg-red-100 text-red-600 border-red-200" },
    no_spot:       { label: "😔 No Spot",    cls: "bg-slate-100 text-slate-500 border-slate-200" },
    window_closed: { label: "🕐 Closed",     cls: "bg-slate-100 text-slate-500 border-slate-200" },
    waiting:       { label: "⏳ Waiting",    cls: "bg-purple-100 text-purple-700 border-purple-200" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border", s.cls)}>
      {s.label}
    </span>
  );
}

/** Days until a date string, or null */
function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return differenceInDays(parseISO(dateStr), new Date());
}

export function Dashboard() {
  const queryClient = useQueryClient();
  const { data: targets, isLoading: targetsLoading } = useListTargets();
  const { data: bookings, isLoading: bookingsLoading } = useListBookings({ limit: 5 });
  const { data: registrationsRes, isLoading: regLoading } = useGetCurrentRegistrations();
  const { data: scheduler, isLoading: schedulerLoading } = useGetSchedulerStatus();

  const triggerScrape = useTriggerScrape();
  const triggerScheduler = useTriggerScheduler();

  const handleScrape = () => {
    triggerScrape.mutate(undefined, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCurrentRegistrationsQueryKey() }),
    });
  };

  const handleRunScheduler = () => {
    triggerScheduler.mutate(undefined, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetSchedulerStatusQueryKey() }),
    });
  };

  const today = new Date().toISOString().slice(0, 10);
  const activeTargets = targets?.filter(t =>
    t.status === "active" &&
    // Exclude activities whose registration date has already passed
    (!t.registrationDate || t.registrationDate >= today)
  ) || [];

  return (
    <div className="space-y-6">
      {/* ── Agastya's current enrollments — hero banner ── */}
      <div className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-2xl">🏅</span>
              <h2 className="text-lg font-extrabold text-emerald-900">Agastya Mahajan's Activities</h2>
            </div>
            <p className="text-xs font-semibold text-emerald-700 ml-9">
              {regLoading
                ? "Loading live data…"
                : registrationsRes?.source === "live"
                  ? `Live · refreshed ${format(parseISO(registrationsRes.scrapedAt), "h:mm a")}`
                  : registrationsRes?.source === "stub"
                    ? "Demo data — connect credentials to see live"
                    : "Could not load"}
            </p>
          </div>
          <button
            onClick={handleScrape}
            disabled={triggerScrape.isPending}
            title="Refresh"
            className="w-9 h-9 rounded-2xl bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 flex items-center justify-center transition-colors shrink-0"
          >
            <RefreshCw className={cn("w-4 h-4 text-emerald-700", triggerScrape.isPending && "animate-spin")} />
          </button>
        </div>

        <div className="px-5 pb-5">
          {regLoading ? (
            <div className="text-sm text-emerald-700 font-medium py-4 text-center">Loading… 🔄</div>
          ) : registrationsRes?.registrations && registrationsRes.registrations.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {registrationsRes.registrations.map((reg, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0 bg-white rounded-2xl border border-emerald-200 shadow-sm p-4 w-52"
                >
                  <div className="text-3xl mb-2">{activityEmoji(reg.name)}</div>
                  <div className="font-extrabold text-sm text-foreground leading-tight">{reg.name}</div>
                  {reg.level && (
                    <div className="text-xs font-bold text-emerald-600 mt-0.5">{reg.level}</div>
                  )}
                  <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground font-medium">
                    {reg.dates && <div>📅 {reg.dates}</div>}
                    {reg.times && <div>🕐 {reg.times}</div>}
                    {reg.location && <div>📍 {reg.location}</div>}
                  </div>
                  <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    ✅ Enrolled
                  </div>
                </div>
              ))}
            </div>
          ) : registrationsRes?.error ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              <span className="text-2xl block mb-1">🤔</span>
              Couldn't load right now — try refreshing
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">
              <span className="text-2xl block mb-1">📭</span>
              No enrolled activities found yet
            </div>
          )}
        </div>
      </div>

      {/* ── Header ── */}
      <header>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-4xl">👋</span>
          <h1 className="text-3xl font-extrabold tracking-tight">Adventure HQ</h1>
        </div>
        <p className="text-muted-foreground font-medium">
          Your activity robot is on the lookout! Here's what's happening:
        </p>
      </header>

      {/* ── Countdown cards for active targets ── */}
      {activeTargets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activeTargets.map(t => {
            const days = daysUntil(t.registrationDate);
            const colors = [
              { bg: "bg-blue-50 border-blue-200",     accent: "bg-blue-500",   textAccent: "text-blue-700" },
              { bg: "bg-orange-50 border-orange-200", accent: "bg-orange-400", textAccent: "text-orange-700" },
              { bg: "bg-purple-50 border-purple-200", accent: "bg-purple-500", textAccent: "text-purple-700" },
              { bg: "bg-emerald-50 border-emerald-200", accent: "bg-emerald-500", textAccent: "text-emerald-700" },
            ];
            const col = colors[t.id % colors.length]!;

            return (
              <div key={t.id} className={cn("rounded-3xl border-2 p-5 overflow-hidden relative", col.bg)}>
                <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-full opacity-10", col.accent)} style={{ transform: "translate(30%,-30%)" }} />
                <div className="flex items-start justify-between mb-3">
                  <ActivityIllustration activityName={t.activityName} size="lg" className="wiggle" />
                  <StatusPill status={t.status} />
                </div>
                <div className="font-extrabold text-lg text-foreground leading-tight">{t.activityName}</div>
                <div className={cn("text-sm font-bold mb-3", col.textAccent)}>{t.level}</div>

                {days !== null ? (
                  days < 0 ? (
                    <div className="text-xs font-bold text-muted-foreground">Registration date passed</div>
                  ) : days === 0 ? (
                    <div className="text-sm font-extrabold text-red-600 animate-pulse">🚨 Sign-up TODAY!</div>
                  ) : (
                    <div className="flex items-baseline gap-1.5">
                      <span className={cn("text-4xl font-extrabold", col.textAccent)}>{days}</span>
                      <span className="text-sm font-bold text-muted-foreground">days until sign-up</span>
                    </div>
                  )
                ) : (
                  <div className="text-xs text-muted-foreground font-medium">No date set yet</div>
                )}

                {t.registrationDate && (
                  <div className="mt-2 text-xs text-muted-foreground font-medium">
                    📅 {format(parseISO(t.registrationDate), "EEEE, MMMM d")} at {t.checkWindowStart} PT
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Scheduler + Targets ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scheduler Status */}
          <div className="bg-card rounded-3xl border-2 border-card-border overflow-hidden shadow-sm">
            <div className="p-5 border-b border-card-border flex items-center justify-between bg-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-500 flex items-center justify-center text-2xl shadow-sm">
                  🤖
                </div>
                <div>
                  <h2 className="font-extrabold text-base">My Robot Helper</h2>
                  <div className="text-xs font-bold flex items-center gap-1.5 mt-0.5">
                    {scheduler?.isRunning ? (
                      <><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-emerald-600">Watching for spots!</span></>
                    ) : (
                      <><span className="w-2 h-2 rounded-full bg-gray-400" />
                      <span className="text-muted-foreground">Resting…</span></>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunScheduler}
                disabled={triggerScheduler.isPending}
                className="rounded-xl border-2 font-bold text-xs bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
              >
                {triggerScheduler.isPending
                  ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  : <Play className="w-3.5 h-3.5 mr-1.5" />}
                Check Now!
              </Button>
            </div>

            <div>
              {schedulerLoading ? (
                <div className="p-8 text-center text-muted-foreground font-medium">Loading… 🔄</div>
              ) : scheduler?.targets && scheduler.targets.length > 0 ? (
                <div className="divide-y divide-card-border">
                  {scheduler.targets.map(st => (
                    <div key={st.targetId} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{activityEmoji(st.activityName)}</span>
                        <div>
                          <div className="font-bold text-sm">{st.activityName}
                            <span className="text-muted-foreground font-medium ml-2 text-xs">{st.level}</span>
                          </div>
                          <div className="text-xs text-muted-foreground font-medium mt-0.5">
                            ⏰ {st.checkWindowStart} – {st.checkWindowEnd} PT
                            {st.nextCheckAt && (
                              <span className="ml-3">📅 {format(parseISO(st.nextCheckAt), "MMM d")}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <StatusPill status={st.schedulerState} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <span className="text-4xl">🤷</span>
                  <p className="font-bold">No activities to watch yet!</p>
                  <p className="text-sm">Add some activities in the Activities page.</p>
                </div>
              )}
            </div>
          </div>

          {/* Watching Targets */}
          {activeTargets.length > 0 && (
            <div className="bg-card rounded-3xl border-2 border-card-border overflow-hidden shadow-sm">
              <div className="p-5 border-b border-card-border bg-orange-50">
                <h2 className="font-extrabold text-base flex items-center gap-2">
                  👀 Activities We're Watching
                </h2>
              </div>
              {targetsLoading ? (
                <div className="p-6 text-center text-muted-foreground font-medium">Loading… 🔄</div>
              ) : (
                <div className="divide-y divide-card-border">
                  {activeTargets.map(t => (
                    <div key={t.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{activityEmoji(t.activityName)}</span>
                        <div>
                          <div className="font-bold">{t.activityName}</div>
                          <div className="text-sm text-muted-foreground font-medium">{t.level}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-foreground">
                          {t.registrationDate ? format(parseISO(t.registrationDate), "MMM d, yyyy") : "Date TBD"}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium mt-0.5">
                          {t.lastCheckedAt ? `Checked ${format(parseISO(t.lastCheckedAt), "h:mm a")}` : "Not checked yet"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Enrollments + Recent Log ── */}
        <div className="space-y-6">
          {/* Already Enrolled */}
          <div className="bg-card rounded-3xl border-2 border-card-border overflow-hidden shadow-sm">
            <div className="p-4 border-b border-card-border flex justify-between items-center bg-emerald-50">
              <h2 className="font-extrabold text-sm flex items-center gap-2 text-emerald-800">
                🏆 Already Signed Up!
              </h2>
              <button
                onClick={handleScrape}
                disabled={triggerScrape.isPending}
                className="w-8 h-8 rounded-xl bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 flex items-center justify-center transition-colors"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-emerald-700", triggerScrape.isPending && "animate-spin")} />
              </button>
            </div>

            <div>
              {regLoading ? (
                <div className="p-6 text-center text-sm text-muted-foreground font-medium">Loading… 🔄</div>
              ) : registrationsRes?.registrations && registrationsRes.registrations.length > 0 ? (
                <div className="divide-y divide-card-border">
                  {registrationsRes.registrations.map((reg, idx) => (
                    <div key={idx} className="p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                      <span className="text-xl mt-0.5">{activityEmoji(reg.name)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-foreground">{reg.name}</div>
                        {reg.level && <div className="text-xs text-muted-foreground font-medium">{reg.level}</div>}
                        <div className="mt-1.5 text-[11px] text-muted-foreground font-medium space-y-0.5">
                          {reg.dates && <div>📅 {reg.dates}</div>}
                          {reg.times && <div>🕐 {reg.times}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="p-3 bg-muted/30 text-[10px] text-muted-foreground font-medium text-center">
                    Updated {format(parseISO(registrationsRes.scrapedAt), "h:mm a")}
                  </div>
                </div>
              ) : registrationsRes?.error ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <span className="text-2xl block mb-2">🤔</span>
                  Couldn't load right now
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground font-medium">
                  <span className="text-2xl block mb-2">📭</span>
                  None found yet
                </div>
              )}
            </div>
          </div>

          {/* Recent Attempts */}
          <div className="bg-card rounded-3xl border-2 border-card-border overflow-hidden shadow-sm">
            <div className="p-4 border-b border-card-border bg-purple-50">
              <h2 className="font-extrabold text-sm text-purple-800">🕐 Recent Attempts</h2>
            </div>
            <div>
              {bookingsLoading ? (
                <div className="p-6 text-center text-sm text-muted-foreground font-medium">Loading… 🔄</div>
              ) : bookings && bookings.length > 0 ? (
                <div className="divide-y divide-card-border">
                  {bookings.map(log => (
                    <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex justify-between items-start mb-1.5">
                        <StatusPill status={log.outcome} />
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {format(parseISO(log.attemptedAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <div className="font-bold text-sm">
                        {activityEmoji(log.activityName || "")} {log.activityName || "Unknown"}
                      </div>
                      {log.confirmationNumber && (
                        <div className="mt-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg inline-block">
                          ✅ Ref #{log.confirmationNumber}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground font-medium">
                  <span className="text-2xl block mb-2">📭</span>
                  No attempts yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
