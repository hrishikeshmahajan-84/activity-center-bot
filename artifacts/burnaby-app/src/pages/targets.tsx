import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useListTargets, useCreateTarget, useUpdateTarget, useDeleteTarget, useGetTarget, useDryRunCheckAndBook, getListTargetsQueryKey, ActivityTargetStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Loader2, ArrowLeft, FlaskConical, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
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
  if (n.includes("hockey")) return "🏒";
  return "🎯";
}

function StatusPill({ status }: { status: string }) {
  if (status === "active") return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">👀 Watching</span>;
  if (status === "booked") return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">🎉 Booked!</span>;
  return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">💤 Stopped</span>;
}

const CARD_ACCENTS = [
  { border: "border-blue-200", top: "bg-blue-400", icon: "bg-blue-50" },
  { border: "border-orange-200", top: "bg-orange-400", icon: "bg-orange-50" },
  { border: "border-purple-200", top: "bg-purple-400", icon: "bg-purple-50" },
  { border: "border-emerald-200", top: "bg-emerald-400", icon: "bg-emerald-50" },
  { border: "border-pink-200", top: "bg-pink-400", icon: "bg-pink-50" },
];

type DryRunResult = {
  outcome: string;
  message: string;
  classDate?: string | null;
  classTime?: string | null;
};

function DryRunResultBox({ result }: { result: DryRunResult }) {
  const isOk = result.outcome === "success" || result.outcome === "registration_not_open";
  const isError = result.outcome === "scraper_error" || result.outcome === "failed" || result.outcome === "not_configured";
  return (
    <div className={cn(
      "mt-3 rounded-2xl border-2 p-3 text-sm",
      isOk ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
      isError ? "bg-red-50 border-red-200 text-red-800" :
      "bg-amber-50 border-amber-200 text-amber-800"
    )}>
      <div className="flex items-start gap-2">
        {isOk ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> :
         isError ? <XCircle className="w-4 h-4 mt-0.5 shrink-0" /> :
         <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
        <div className="space-y-1">
          <p className="font-bold capitalize">{result.outcome.replace(/_/g, " ")}</p>
          <p className="font-medium opacity-90">{result.message}</p>
          {(result.classDate || result.classTime) && (
            <p className="opacity-75 text-xs">{[result.classDate, result.classTime].filter(Boolean).join(" · ")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function TargetsList() {
  const { data: targets, isLoading } = useListTargets();
  const deleteTarget = useDeleteTarget();
  const dryRun = useDryRunCheckAndBook();
  const queryClient = useQueryClient();
  const [dryRunResults, setDryRunResults] = useState<Record<number, DryRunResult>>({});
  const [dryRunning, setDryRunning] = useState<Record<number, boolean>>({});

  const handleDryRun = async (id: number) => {
    setDryRunning(prev => ({ ...prev, [id]: true }));
    setDryRunResults(prev => { const n = { ...prev }; delete n[id]; return n; });
    try {
      const result = await dryRun.mutateAsync({ targetId: id });
      setDryRunResults(prev => ({ ...prev, [id]: result }));
      queryClient.invalidateQueries({ queryKey: getListTargetsQueryKey() });
    } catch (e) {
      setDryRunResults(prev => ({ ...prev, [id]: { outcome: "scraper_error", message: e instanceof Error ? e.message : "Unknown error" } }));
    } finally {
      setDryRunning(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Remove this activity from the watch list?")) {
      deleteTarget.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTargetsQueryKey() }),
      });
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">🎯</span>
            <h1 className="text-3xl font-extrabold tracking-tight">Activities</h1>
          </div>
          <p className="text-muted-foreground font-medium">Activities we're trying to book automatically</p>
        </div>
        <Link href="/targets/new">
          <Button className="rounded-2xl font-bold shadow-md gap-2 h-10 px-5">
            <Plus className="w-4 h-4" /> Add Activity
          </Button>
        </Link>
      </header>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !targets || targets.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed border-border rounded-3xl bg-card">
          <div className="text-6xl mb-4">🌟</div>
          <h3 className="text-xl font-extrabold mb-2">No Activities Yet!</h3>
          <p className="text-muted-foreground font-medium mb-6 max-w-md mx-auto">
            Add an activity and the robot will watch for open spots automatically!
          </p>
          <Link href="/targets/new">
            <Button className="rounded-2xl font-bold shadow-md gap-2 h-10 px-5">
              <Plus className="w-4 h-4" /> Add First Activity
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {targets.map((t, i) => {
            const accent = CARD_ACCENTS[i % CARD_ACCENTS.length]!;
            const emoji = activityEmoji(t.activityName);
            return (
              <div key={t.id} className={cn("bg-card border-2 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow", accent.border)}>
                {/* Color top bar */}
                <div className={cn("h-2 w-full", accent.top)} />

                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm", accent.icon)}>
                        {emoji}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-lg leading-tight">{t.activityName}</h3>
                        <p className="text-muted-foreground font-medium text-sm">{t.level}</p>
                      </div>
                    </div>
                    <StatusPill status={t.status} />
                  </div>

                  <div className="space-y-2 mb-5">
                    <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-2.5 text-sm font-medium">
                      <span className="text-base">📅</span>
                      <span className="text-foreground">
                        {t.registrationDate ? format(parseISO(t.registrationDate), "EEEE, MMM d, yyyy") : "Date not set yet"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-2.5 text-sm font-medium">
                      <span className="text-base">⏰</span>
                      <span className="text-foreground">{t.checkWindowStart} — {t.checkWindowEnd} PT</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <div className="text-xs text-muted-foreground font-medium">
                      {t.lastCheckedAt ? `Last checked ${format(parseISO(t.lastCheckedAt), "h:mm a")}` : "Not checked yet"}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleDryRun(t.id)}
                        title="Dry run — test the full booking flow without actually booking"
                        className="w-8 h-8 rounded-xl bg-muted hover:bg-purple-100 hover:text-purple-600 flex items-center justify-center transition-colors"
                        disabled={dryRunning[t.id]}
                      >
                        {dryRunning[t.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                      </button>
                      <Link href={`/targets/${t.id}/edit`}>
                        <button className="w-8 h-8 rounded-xl bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="w-8 h-8 rounded-xl bg-muted hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors"
                        disabled={deleteTarget.isPending}
                      >
                        {deleteTarget.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  {dryRunResults[t.id] && <DryRunResultBox result={dryRunResults[t.id]!} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inputClass = "flex h-11 w-full rounded-2xl border-2 border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

export function TargetForm() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const isNew = !params.id || params.id === "new";
  const id = isNew ? 0 : parseInt(params.id as string, 10);

  const { data: existingTarget, isLoading } = useGetTarget(id, { query: { enabled: !isNew, queryKey: ["target", id] } });

  const createTarget = useCreateTarget();
  const updateTarget = useUpdateTarget();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    activityName: "",
    level: "",
    registrationDate: "",
    checkWindowStart: "09:50",
    checkWindowEnd: "10:10",
    classDay: "",
    classTime: "",
    notes: "",
    status: "active" as ActivityTargetStatus,
  });

  if (!isNew && existingTarget && !formData.activityName && existingTarget.activityName) {
    setFormData({
      activityName: existingTarget.activityName,
      level: existingTarget.level,
      registrationDate: existingTarget.registrationDate || "",
      checkWindowStart: existingTarget.checkWindowStart || "09:50",
      checkWindowEnd: existingTarget.checkWindowEnd || "10:10",
      classDay: existingTarget.classDay || "",
      classTime: existingTarget.classTime || "",
      notes: existingTarget.notes || "",
      status: existingTarget.status,
    });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      activityName: formData.activityName,
      level: formData.level,
      registrationDate: formData.registrationDate || undefined,
      checkWindowStart: formData.checkWindowStart || undefined,
      checkWindowEnd: formData.checkWindowEnd || undefined,
      classDay: formData.classDay || undefined,
      classTime: formData.classTime || undefined,
      notes: formData.notes || undefined,
      status: formData.status,
    };
    if (isNew) {
      createTarget.mutate({ data: payload }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTargetsQueryKey() }); setLocation("/targets"); },
      });
    } else {
      updateTarget.mutate({ id, data: payload }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTargetsQueryKey() }); setLocation("/targets"); },
      });
    }
  };

  if (!isNew && isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const isSaving = createTarget.isPending || updateTarget.isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="mb-6">
        <Link href="/targets" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4 font-bold gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Activities
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{isNew ? "✨" : "✏️"}</span>
          <h1 className="text-2xl font-extrabold">{isNew ? "Add New Activity" : "Edit Activity"}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border-2 border-card-border rounded-3xl p-6 space-y-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-1.5">🏃 Activity Name</label>
            <input
              required type="text" className={inputClass}
              placeholder="e.g. Swimming"
              value={formData.activityName}
              onChange={e => setFormData({ ...formData, activityName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-1.5">⭐ Level</label>
            <input
              required type="text" className={inputClass}
              placeholder="e.g. Orca"
              value={formData.level}
              onChange={e => setFormData({ ...formData, level: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-1.5">📅 Sign-Up Date</label>
          <input
            type="date" className={inputClass}
            value={formData.registrationDate}
            onChange={e => setFormData({ ...formData, registrationDate: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-1.5">🕘 Check From</label>
            <input
              type="time" className={inputClass}
              value={formData.checkWindowStart}
              onChange={e => setFormData({ ...formData, checkWindowStart: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-1.5">🕚 Check Until</label>
            <input
              type="time" className={inputClass}
              value={formData.checkWindowEnd}
              onChange={e => setFormData({ ...formData, checkWindowEnd: e.target.value })}
            />
          </div>
        </div>

        {!isNew && (
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-1.5">📊 Status</label>
            <select
              className={inputClass}
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value as ActivityTargetStatus })}
            >
              <option value="active">👀 Active (Watching)</option>
              <option value="booked">🎉 Booked! (Success)</option>
              <option value="cancelled">💤 Cancelled (Stopped)</option>
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-1.5">📆 Class Day <span className="font-normal text-muted-foreground">(optional)</span></label>
            <input
              type="text" className={inputClass}
              placeholder="e.g. Wednesday"
              value={formData.classDay}
              onChange={e => setFormData({ ...formData, classDay: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Day of week the class runs — helps the bot pick the right session</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-1.5">🕕 Class Time <span className="font-normal text-muted-foreground">(optional)</span></label>
            <input
              type="text" className={inputClass}
              placeholder="e.g. 6:00 PM"
              value={formData.classTime}
              onChange={e => setFormData({ ...formData, classTime: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Time the class starts — used with Class Day to identify the exact session</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-1.5">📝 Notes (Optional)</label>
          <textarea
            className={cn(inputClass, "min-h-[80px] h-auto")}
            placeholder="Any specific location or instructor preferences..."
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-border">
          <Link href="/targets">
            <Button variant="outline" type="button" className="rounded-2xl font-bold border-2">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSaving} className="rounded-2xl font-bold shadow-md gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{isNew ? "✨" : "💾"}</span>}
            {isNew ? "Add Activity!" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
