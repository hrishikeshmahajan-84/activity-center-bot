import { useListTargets, useListBookings, useGetCurrentRegistrations, useGetSchedulerStatus, useTriggerScrape, useTriggerScheduler, getGetCurrentRegistrationsQueryKey, getGetSchedulerStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Play, Clock, CheckCircle2, XCircle, AlertTriangle, Info, Calendar, Activity, ActivityIcon, Target } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function StatusBadge({ status }: { status: string }) {
  if (status === "active" || status === "active_window") return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">Active</span>;
  if (status === "booked" || status === "success") return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Booked</span>;
  if (status === "cancelled") return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-muted">Cancelled</span>;
  if (status === "failed" || status === "scraper_error") return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">Error</span>;
  if (status === "no_spot") return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">No Spot</span>;
  if (status === "window_closed") return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">Closed</span>;
  if (status === "waiting") return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">Waiting</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">{status}</span>;
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
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCurrentRegistrationsQueryKey() });
      }
    });
  };

  const handleRunScheduler = () => {
    triggerScheduler.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSchedulerStatusQueryKey() });
      }
    });
  };

  const activeTargets = targets?.filter(t => t.status === "active") || [];

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Command Centre</h1>
        <p className="text-muted-foreground">Monitor your active registration targets and recent activity.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scheduler & Targets */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scheduler Status Panel */}
          <div className="bg-card rounded-xl border border-card-border overflow-hidden">
            <div className="p-5 border-b border-card-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">Scheduler Status</h2>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    {scheduler?.isRunning ? (
                      <><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Engine Active</>
                    ) : (
                      <><span className="w-2 h-2 rounded-full bg-muted-foreground" /> Engine Stopped</>
                    )}
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRunScheduler}
                disabled={triggerScheduler.isPending}
                className="hover-elevate font-mono text-xs"
              >
                {triggerScheduler.isPending ? <RefreshCw className="w-3 h-3 mr-2 animate-spin" /> : <Play className="w-3 h-3 mr-2" />}
                Run Now
              </Button>
            </div>
            
            <div className="p-0">
              {schedulerLoading ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Loading scheduler state...</div>
              ) : scheduler?.targets && scheduler.targets.length > 0 ? (
                <div className="divide-y divide-card-border">
                  {scheduler.targets.map(st => (
                    <div key={st.targetId} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                      <div>
                        <div className="font-medium text-sm mb-1">{st.activityName} <span className="text-muted-foreground font-normal ml-2">{st.level}</span></div>
                        <div className="text-xs font-mono text-muted-foreground flex items-center gap-3">
                          {st.nextCheckAt && (
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Next: {format(parseISO(st.nextCheckAt), "MMM d, h:mm a")}</span>
                          )}
                          <span>Window: {st.checkWindowStart} - {st.checkWindowEnd}</span>
                        </div>
                      </div>
                      <StatusBadge status={st.schedulerState} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center">
                  <Info className="w-8 h-8 text-muted-foreground/30 mb-3" />
                  No targets actively monitored in the scheduler.
                </div>
              )}
            </div>
          </div>

          {/* Active Targets Summary */}
          <div className="bg-card rounded-xl border border-card-border overflow-hidden">
            <div className="p-5 border-b border-card-border">
              <h2 className="font-semibold flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Watching Targets</h2>
            </div>
            {targetsLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading targets...</div>
            ) : activeTargets.length > 0 ? (
              <div className="divide-y divide-card-border">
                {activeTargets.map(t => (
                  <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 transition-colors">
                    <div>
                      <div className="font-medium">{t.activityName}</div>
                      <div className="text-sm text-muted-foreground">{t.level}</div>
                    </div>
                    <div className="flex flex-col sm:items-end text-sm">
                      <div className="font-mono text-xs">{t.registrationDate ? format(parseISO(t.registrationDate), "MMM d, yyyy") : "Date TBD"}</div>
                      <div className="text-xs text-muted-foreground mt-1">Checked: {t.lastCheckedAt ? format(parseISO(t.lastCheckedAt), "h:mm a") : "Never"}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No active targets right now. Add one in the Targets tab.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Registrations & Recent Log */}
        <div className="space-y-6">
          {/* Current Registrations */}
          <div className="bg-card rounded-xl border border-card-border overflow-hidden">
             <div className="p-5 border-b border-card-border flex justify-between items-center bg-primary/5">
              <h2 className="font-semibold flex items-center gap-2 text-primary"><ActivityIcon className="w-4 h-4" /> Enrolled</h2>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-7 h-7 text-primary hover:text-primary hover:bg-primary/20"
                onClick={handleScrape}
                disabled={triggerScrape.isPending}
              >
                <RefreshCw className={cn("w-3.5 h-3.5", triggerScrape.isPending && "animate-spin")} />
              </Button>
            </div>
            
            <div className="p-0">
              {regLoading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Fetching registrations...</div>
              ) : registrationsRes?.error ? (
                <div className="p-6 text-center text-sm text-destructive flex flex-col items-center">
                  <AlertTriangle className="w-6 h-6 mb-2 opacity-80" />
                  {registrationsRes.error}
                </div>
              ) : registrationsRes?.registrations && registrationsRes.registrations.length > 0 ? (
                <div className="divide-y divide-card-border">
                  {registrationsRes.registrations.map((reg, idx) => (
                    <div key={idx} className="p-4 text-sm hover:bg-muted/10 transition-colors">
                      <div className="font-medium text-foreground">{reg.name}</div>
                      {reg.level && <div className="text-muted-foreground mt-0.5">{reg.level}</div>}
                      <div className="mt-2 font-mono text-[11px] text-muted-foreground/80 space-y-1">
                        {reg.dates && <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {reg.dates}</div>}
                        {reg.times && <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {reg.times}</div>}
                      </div>
                    </div>
                  ))}
                  <div className="p-3 bg-muted/20 text-[10px] text-muted-foreground/60 text-center flex justify-between px-4">
                    <span>Source: {registrationsRes.source}</span>
                    <span>Last scraped: {format(parseISO(registrationsRes.scrapedAt), "h:mm a")}</span>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">No current enrollments found.</div>
              )}
            </div>
          </div>

          {/* Recent Log */}
          <div className="bg-card rounded-xl border border-card-border overflow-hidden">
            <div className="p-4 border-b border-card-border">
              <h2 className="font-semibold text-sm">Recent Booking Attempts</h2>
            </div>
            <div className="p-0">
              {bookingsLoading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Loading logs...</div>
              ) : bookings && bookings.length > 0 ? (
                <div className="divide-y divide-card-border">
                  {bookings.map(log => (
                    <div key={log.id} className="p-4 text-sm hover:bg-muted/10 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <StatusBadge status={log.outcome} />
                        <span className="font-mono text-[10px] text-muted-foreground">{format(parseISO(log.attemptedAt), "MMM d, h:mm a")}</span>
                      </div>
                      <div className="font-medium mb-1">{log.activityName || "Unknown Activity"}</div>
                      <div className="text-xs text-muted-foreground">{log.notes || "No additional notes"}</div>
                      {log.confirmationNumber && (
                        <div className="mt-2 text-xs font-mono bg-muted/30 px-2 py-1 rounded inline-block text-foreground border border-border/50">
                          Ref: {log.confirmationNumber}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">No log history yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
