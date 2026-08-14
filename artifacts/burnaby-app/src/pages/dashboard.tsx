import { useListTargets, useCreateTarget, getListTargetsQueryKey, useGetCurrentRegistrations, useGetSchedulerStatus, useGetUpcomingClasses, getGetUpcomingClassesQueryKey, useTriggerScrape, useTriggerScheduler, getGetCurrentRegistrationsQueryKey, getGetSchedulerStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Play } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ActivityIllustration } from "@/components/activity-illustration";

/** Pick an emoji based on activity name */
function activityEmoji(name: string): string {
  const n = (name ?? "").toLowerCase();
  if (n.includes("swim") || n.includes("preschool")) return "🏊";
  if (n.includes("skat") || n.includes("ice") || n.includes("glider")) return "⛸️";
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

/**
 * Level progressions for Burnaby programs. A child must clear the current
 * level before moving to the next one, so we only surface the immediate
 * next step for each program he's currently in.
 */
const PROGRESSIONS: { pattern: RegExp; prefix: string; max: number }[] = [
  { pattern: /preschool\s*(\d)/i, prefix: "Preschool", max: 5 },
  { pattern: /swimmer\s*(\d)/i, prefix: "Swimmer", max: 6 },
  { pattern: /gliders?\s*(\d)/i, prefix: "Gliders", max: 5 },
];

type FutureActivity = { program: string; current: string; next: string };

/**
 * Derive, for each program found in the activity names, the current level
 * (he can still enroll in more classes at this level) and the next level
 * (locked until he clears the current one).
 */
function futureActivities(names: string[]): FutureActivity[] {
  const best = new Map<string, number>();
  for (const name of names) {
    for (const { pattern, prefix, max } of PROGRESSIONS) {
      const m = name.match(pattern);
      if (m) {
        const n = parseInt(m[1]!, 10);
        if (n < max) {
          const cur = best.get(prefix);
          if (cur === undefined || n > cur) best.set(prefix, n);
        }
      }
    }
  }
  return [...best.entries()].map(([prefix, n]) => ({
    program: prefix,
    current: `${prefix} ${n}`,
    next: `${prefix} ${n + 1}`,
  }));
}

/** Days until a date string, or null */
function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return differenceInDays(parseISO(dateStr), new Date());
}

export function Dashboard() {
  const queryClient = useQueryClient();
  const { data: targets } = useListTargets();
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

  // Hide completed activities from the cards; they still feed the "Up Next"
  // progression (a completed Gliders 2 is what unlocks Gliders 3).
  const currentRegistrations =
    registrationsRes?.registrations?.filter(r => r.status !== "Completed") ?? [];

  const upNext = futureActivities([
    ...(registrationsRes?.registrations?.map(r => `${r.name} ${r.level ?? ""}`) ?? []),
    ...activeTargets.map(t => `${t.activityName} ${t.level ?? ""}`),
  ]);

  // Search the public catalog for upcoming classes at both the current level
  // (he can keep enrolling there) and the next level (locked until he clears
  // the current one).
  const keywords = upNext.flatMap(f => [f.current, f.next]);
  const upcomingParams = { keywords: keywords.join(",") };
  const { data: upcomingRes, isLoading: upcomingLoading } = useGetUpcomingClasses(
    upcomingParams,
    { query: { queryKey: getGetUpcomingClassesQueryKey(upcomingParams), enabled: keywords.length > 0, staleTime: 30 * 60_000 } }
  );

  const nextLevels = new Set(upNext.map(f => f.next));
  const currentOf = new Map(upNext.map(f => [f.next, f.current]));
  const upcomingClasses = upcomingRes?.classes ?? [];

  // Create a robot booking target straight from an Up Next class
  const createTarget = useCreateTarget();
  const activeTargetList = (targets ?? []).filter(t => t.status === "active");
  const targetedLevels = new Set(activeTargetList.map(t => t.level.toLowerCase()));
  const targetedPrograms = new Set(activeTargetList.map(t => t.activityName.toLowerCase()));
  const programOf = (keyword: string) =>
    /^(preschool|swimmer)/i.test(keyword) ? "Swimming" : /^glider/i.test(keyword) ? "Ice Skating" : keyword;
  const isTargeted = (keyword: string) =>
    targetedLevels.has(keyword.toLowerCase()) ||
    targetedPrograms.has(programOf(keyword).toLowerCase());
  const handleAutoBook = (c: (typeof upcomingClasses)[number]) => {
    createTarget.mutate(
      {
        data: {
          activityName: programOf(c.keyword),
          level: c.keyword,
          registrationDate: c.registrationDate ?? today,
          notes: [c.name, c.courseNumber ? `#${c.courseNumber}` : null, c.daysOfWeek, c.times, c.site]
            .filter(Boolean)
            .join(" · "),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTargetsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetSchedulerStatusQueryKey() });
        },
      }
    );
  };

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
          ) : currentRegistrations.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {currentRegistrations.map((reg, idx) => (
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
                  {reg.status === "Waitlisted" ? (
                    <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                      ⏳ Waitlisted
                    </div>
                  ) : reg.status === "Completed" ? (
                    <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      🏁 Completed
                    </div>
                  ) : (
                    <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      ✅ Enrolled
                    </div>
                  )}
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
          <h1 className="text-3xl font-extrabold tracking-tight">Activity Center</h1>
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

      {/* ── Up Next for Agastya ── */}
      <div className="bg-card rounded-3xl border-2 border-card-border overflow-hidden shadow-sm">
        <div className="px-5 pt-5 pb-3 border-b border-card-border bg-sky-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-2xl">🚀</span>
              <h2 className="text-lg font-extrabold text-sky-900">Up Next for Agastya</h2>
            </div>
            <p className="text-xs font-semibold text-sky-700 ml-9">
              He needs to clear his current level before moving up
            </p>
          </div>
        </div>

        <div>
          {regLoading || upcomingLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground font-medium">Loading… 🔄</div>
          ) : upcomingClasses.length > 0 ? (
            <div className="divide-y divide-card-border">
              {upcomingClasses.map((c, idx) => {
                const isNextLevel = nextLevels.has(c.keyword);
                return (
                  <div key={idx} className="px-5 py-4 flex items-start gap-4 hover:bg-muted/30 transition-colors">
                    <span className="text-2xl mt-0.5">{activityEmoji(c.name)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{c.name}</span>
                        {c.courseNumber && (
                          <span className="text-[10px] font-bold text-muted-foreground">#{c.courseNumber}</span>
                        )}
                        {isNextLevel ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            🔒 after {currentOf.get(c.keyword)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            ✅ can enroll now
                          </span>
                        )}
                        {c.status === "Full" && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 border border-red-200">
                            Full
                          </span>
                        )}
                        {c.openings != null && c.openings > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                            {c.openings} spot{c.openings === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground font-medium space-y-0.5">
                        <div>📆 Registration: {c.registrationDate ?? "open now"}</div>
                        {(c.dateStart || c.dateEnd) && (
                          <div>📅 {c.dateStart}{c.dateEnd && c.dateEnd !== c.dateStart ? ` – ${c.dateEnd}` : ""}</div>
                        )}
                        {(c.daysOfWeek || c.times) && (
                          <div>🕐 {[c.daysOfWeek, c.times].filter(Boolean).join(" · ")}</div>
                        )}
                        {c.site && <div>📍 {c.site}</div>}
                      </div>
                      <div className="mt-2">
                        {isTargeted(c.keyword) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                            🤖 Robot is on it
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAutoBook(c)}
                            disabled={createTarget.isPending}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors shadow-sm"
                          >
                            🤖 Auto-book this
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground font-medium">
              <span className="text-2xl block mb-2">🗺️</span>
              {upcomingRes?.error
                ? "Couldn't reach the Burnaby catalog — try again in a bit"
                : "No upcoming classes found in the catalog yet"}
            </div>
          )}
        </div>
      </div>

      {/* ── Robot Helper / Scheduler ── */}
      <div className="bg-card rounded-3xl border-2 border-card-border overflow-hidden shadow-sm">
        <div className="px-5 pt-5 pb-3 border-b border-card-border bg-blue-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500 flex items-center justify-center text-2xl shadow-sm">
              🤖
            </div>
            <div>
              <h2 className="font-extrabold text-base">My Robot Helper — booking these next</h2>
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
                <div key={st.targetId} className="px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{activityEmoji(st.activityName)}</span>
                    <div>
                      <div className="font-bold text-sm">{st.activityName}
                        <span className="text-muted-foreground font-medium ml-2 text-xs">{st.level}</span>
                      </div>
                      <div className="text-xs text-muted-foreground font-medium mt-0.5">
                        📆 {st.registrationDate ? `Books on ${format(parseISO(st.registrationDate), "MMM d, yyyy")}` : "No sign-up date set"}
                        <span className="ml-3">⏰ {st.checkWindowStart} – {st.checkWindowEnd} PT</span>
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
    </div>
  );
}
