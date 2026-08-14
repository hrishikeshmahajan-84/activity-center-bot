import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useListTargets, useCreateTarget, useUpdateTarget, useDeleteTarget, useGetTarget, getListTargetsQueryKey, ActivityTargetStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Calendar, Clock, Loader2, ArrowLeft, Target as TargetIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">Active</span>;
  if (status === "booked") return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Booked</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-muted">Cancelled</span>;
}

export function TargetsList() {
  const { data: targets, isLoading } = useListTargets();
  const deleteTarget = useDeleteTarget();
  const queryClient = useQueryClient();

  const handleDelete = (id: number) => {
    if (confirm("Stop watching this target and delete it?")) {
      deleteTarget.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTargetsQueryKey() });
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Targets</h1>
          <p className="text-muted-foreground">Manage activities to watch and book automatically.</p>
        </div>
        <Link href="/targets/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 hover-elevate">
          <Plus className="w-4 h-4 mr-2" /> Add Target
        </Link>
      </header>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : !targets || targets.length === 0 ? (
        <div className="text-center p-12 border border-dashed border-border rounded-xl bg-card/50">
          <TargetIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Targets Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">You aren't watching any activities. Add a target to start automatically checking for spots.</p>
          <Link href="/targets/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 hover-elevate">
            <Plus className="w-4 h-4 mr-2" /> Add Target
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {targets.map(t => (
            <div key={t.id} className="bg-card border border-card-border rounded-xl p-5 hover:border-primary/30 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{t.activityName}</h3>
                  <p className="text-muted-foreground text-sm">{t.level}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center text-sm font-mono text-muted-foreground bg-background/50 p-2 rounded-md border border-border/50">
                  <Calendar className="w-4 h-4 mr-3 text-primary/70" />
                  {t.registrationDate ? format(parseISO(t.registrationDate), "EEEE, MMM d, yyyy") : "No date set"}
                </div>
                <div className="flex items-center text-sm font-mono text-muted-foreground bg-background/50 p-2 rounded-md border border-border/50">
                  <Clock className="w-4 h-4 mr-3 text-primary/70" />
                  {t.checkWindowStart} — {t.checkWindowEnd} PT
                </div>
              </div>
              
              <div className="flex items-center justify-between border-t border-border pt-4">
                <div className="text-[11px] text-muted-foreground font-mono">
                  ID: {t.id} {t.lastCheckedAt && `• Checked: ${format(parseISO(t.lastCheckedAt), "HH:mm")}`}
                </div>
                <div className="flex gap-2">
                  <Link href={`/targets/${t.id}/edit`} className="p-2 text-muted-foreground hover:text-primary transition-colors hover:bg-primary/10 rounded-md">
                    <Edit2 className="w-4 h-4" />
                  </Link>
                  <button onClick={() => handleDelete(t.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors hover:bg-destructive/10 rounded-md" disabled={deleteTarget.isPending}>
                    {deleteTarget.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TargetForm() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const isNew = !params.id || params.id === "new";
  const id = isNew ? 0 : parseInt(params.id as string, 10);
  
  const { data: existingTarget, isLoading } = useGetTarget(id, { query: { enabled: !isNew, queryKey: ['target', id] } });
  
  const createTarget = useCreateTarget();
  const updateTarget = useUpdateTarget();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    activityName: "",
    level: "",
    registrationDate: "",
    checkWindowStart: "09:00",
    checkWindowEnd: "11:00",
    notes: "",
    status: "active" as ActivityTargetStatus
  });

  // Sync when loaded
  if (!isNew && existingTarget && !formData.activityName && existingTarget.activityName) {
    setFormData({
      activityName: existingTarget.activityName,
      level: existingTarget.level,
      registrationDate: existingTarget.registrationDate || "",
      checkWindowStart: existingTarget.checkWindowStart || "09:00",
      checkWindowEnd: existingTarget.checkWindowEnd || "11:00",
      notes: existingTarget.notes || "",
      status: existingTarget.status
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
      notes: formData.notes || undefined,
      status: formData.status
    };

    if (isNew) {
      createTarget.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTargetsQueryKey() });
          setLocation("/targets");
        }
      });
    } else {
      updateTarget.mutate({ id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTargetsQueryKey() });
          setLocation("/targets");
        }
      });
    }
  };

  if (!isNew && isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  const isSaving = createTarget.isPending || updateTarget.isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="mb-6">
        <Link href="/targets" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Targets
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{isNew ? "Add Target" : "Edit Target"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-card-border rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Activity Name</label>
            <input 
              required
              type="text" 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="e.g. Swimming" 
              value={formData.activityName}
              onChange={e => setFormData({...formData, activityName: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Level</label>
            <input 
              required
              type="text" 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="e.g. Orca" 
              value={formData.level}
              onChange={e => setFormData({...formData, level: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Registration Date (YYYY-MM-DD)</label>
          <input 
            type="date" 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={formData.registrationDate}
            onChange={e => setFormData({...formData, registrationDate: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Check Window Start</label>
            <input 
              type="time" 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.checkWindowStart}
              onChange={e => setFormData({...formData, checkWindowStart: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Check Window End</label>
            <input 
              type="time" 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.checkWindowEnd}
              onChange={e => setFormData({...formData, checkWindowEnd: e.target.value})}
            />
          </div>
        </div>

        {!isNew && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value as ActivityTargetStatus})}
            >
              <option value="active">Active (Watching)</option>
              <option value="booked">Booked (Success)</option>
              <option value="cancelled">Cancelled (Stopped)</option>
            </select>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Notes (Optional)</label>
          <textarea 
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Any specific location or instructor preferences..."
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
          />
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-border">
          <Link href="/targets" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
            Cancel
          </Link>
          <Button type="submit" disabled={isSaving} className="hover-elevate">
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isNew ? "Create Target" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
