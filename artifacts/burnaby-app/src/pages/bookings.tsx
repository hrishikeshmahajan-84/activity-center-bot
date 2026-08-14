import { useState } from "react";
import { useListBookings, useListTargets } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { Loader2, FilterX, Clock } from "lucide-react";

function OutcomeBadge({ outcome }: { outcome: string }) {
  if (outcome === "success") return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Success</span>;
  if (outcome === "no_spot") return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">No Spot</span>;
  if (outcome === "window_closed") return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">Window Closed</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">Failed</span>;
}

export function BookingsList() {
  const [targetFilter, setTargetFilter] = useState<number | undefined>();
  const { data: targets } = useListTargets();
  const { data: bookings, isLoading } = useListBookings({ targetId: targetFilter });

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Booking Log</h1>
          <p className="text-muted-foreground">History of all automated check and booking attempts.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={targetFilter || ""}
            onChange={e => setTargetFilter(e.target.value ? parseInt(e.target.value, 10) : undefined)}
          >
            <option value="">All Targets</option>
            {targets?.map(t => (
              <option key={t.id} value={t.id}>{t.activityName} ({t.level})</option>
            ))}
          </select>
          {targetFilter && (
            <button 
              onClick={() => setTargetFilter(undefined)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors bg-muted/50 rounded-md"
              title="Clear filter"
            >
              <FilterX className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 bg-card border border-card-border rounded-xl overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex justify-center items-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : !bookings || bookings.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center p-12 text-muted-foreground">
            <Clock className="w-12 h-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-1 text-foreground">No logs found</h3>
            <p className="text-sm">There are no booking attempts recorded yet.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/30 sticky top-0 backdrop-blur-sm z-10 border-b border-card-border">
                <tr>
                  <th className="px-6 py-3 font-medium">Time (PT)</th>
                  <th className="px-6 py-3 font-medium">Target</th>
                  <th className="px-6 py-3 font-medium">Outcome</th>
                  <th className="px-6 py-3 font-medium">Confirmation</th>
                  <th className="px-6 py-3 font-medium hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {bookings.map(log => (
                  <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-mono whitespace-nowrap">
                      {format(parseISO(log.attemptedAt), "MMM d, HH:mm:ss")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{log.activityName || `Target #${log.targetId}`}</div>
                      <div className="text-xs text-muted-foreground">{log.level}</div>
                    </td>
                    <td className="px-6 py-4">
                      <OutcomeBadge outcome={log.outcome} />
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {log.confirmationNumber ? (
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20">{log.confirmationNumber}</span>
                      ) : "-"}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground max-w-[200px] truncate hidden md:table-cell" title={log.notes || ""}>
                      {log.notes || "-"}
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
