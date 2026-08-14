import { useState } from "react";
import { useListBookings, useListTargets } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { Loader2, FilterX } from "lucide-react";
import { cn } from "@/lib/utils";

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
  return "🎯";
}

function OutcomePill({ outcome }: { outcome: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    success:       { label: "🎉 Booked!",       cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    no_spot:       { label: "😔 No Spot",        cls: "bg-slate-100 text-slate-500 border-slate-200" },
    window_closed: { label: "🕐 Window Closed",  cls: "bg-purple-100 text-purple-600 border-purple-200" },
    scraper_error: { label: "⚠️ Error",          cls: "bg-red-100 text-red-600 border-red-200" },
    failed:        { label: "❌ Failed",          cls: "bg-red-100 text-red-600 border-red-200" },
  };
  const s = map[outcome] ?? { label: outcome, cls: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap", s.cls)}>
      {s.label}
    </span>
  );
}

export function BookingsList() {
  const [targetFilter, setTargetFilter] = useState<number | undefined>();
  const { data: targets } = useListTargets();
  const { data: bookings, isLoading } = useListBookings({ targetId: targetFilter });

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">📋</span>
            <h1 className="text-3xl font-extrabold tracking-tight">History</h1>
          </div>
          <p className="text-muted-foreground font-medium">Everything the robot tried — wins and misses!</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="h-10 rounded-2xl border-2 border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={targetFilter || ""}
            onChange={e => setTargetFilter(e.target.value ? parseInt(e.target.value, 10) : undefined)}
          >
            <option value="">All Activities</option>
            {targets?.map(t => (
              <option key={t.id} value={t.id}>{activityEmoji(t.activityName)} {t.activityName} ({t.level})</option>
            ))}
          </select>
          {targetFilter && (
            <button
              onClick={() => setTargetFilter(undefined)}
              className="w-10 h-10 rounded-2xl bg-muted hover:bg-muted/80 border-2 border-border flex items-center justify-center transition-colors"
              title="Clear filter"
            >
              <FilterX className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 bg-card border-2 border-card-border rounded-3xl overflow-hidden flex flex-col shadow-sm">
        {isLoading ? (
          <div className="flex-1 flex justify-center items-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !bookings || bookings.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center p-12 text-muted-foreground">
            <span className="text-6xl mb-4">📭</span>
            <h3 className="text-xl font-extrabold mb-1 text-foreground">No History Yet</h3>
            <p className="text-sm font-medium">The robot hasn't tried anything yet. Check back soon!</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 sticky top-0 z-10 border-b-2 border-card-border">
                <tr>
                  <th className="px-5 py-3.5 font-extrabold">⏰ Time</th>
                  <th className="px-5 py-3.5 font-extrabold">🏃 Activity</th>
                  <th className="px-5 py-3.5 font-extrabold">Result</th>
                  <th className="px-5 py-3.5 font-extrabold hidden md:table-cell">Confirmation</th>
                  <th className="px-5 py-3.5 font-extrabold hidden lg:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-card-border">
                {bookings.map(log => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4 font-medium text-muted-foreground whitespace-nowrap text-xs">
                      {format(parseISO(log.attemptedAt), "MMM d, HH:mm")}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{activityEmoji(log.activityName || "")}</span>
                        <div>
                          <div className="font-bold text-foreground">{log.activityName || `Activity #${log.targetId}`}</div>
                          <div className="text-xs text-muted-foreground font-medium">{log.level}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <OutcomePill outcome={log.outcome} />
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      {log.confirmationNumber ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs px-2.5 py-1 rounded-lg">
                          #{log.confirmationNumber}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground font-medium max-w-[180px] truncate hidden lg:table-cell" title={log.notes || ""}>
                      {log.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
