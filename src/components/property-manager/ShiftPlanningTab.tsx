import { useState, useMemo } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  Sun,
  Moon,
  Plus,
  Send,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  useStaffProfiles,
  useTodayAssignments,
  useCreateAssignment,
} from "@/hooks/usePropertyManagerData";
import { useWorkPackages } from "@/hooks/useWorkPackages";

interface ShiftSelections {
  morningWps: string[];
  eveningWps: string[];
}

const ShiftPlanningTab = () => {
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  const tomorrowDay = new Date(tomorrow).getDay();

  const { data: staff = [], isLoading: staffLoading } = useStaffProfiles();
  const { data: workPackages = [] } = useWorkPackages();
  const { data: existingAssignments = [] } = useTodayAssignments(tomorrow);
  const createAssignment = useCreateAssignment();

  const relevantWps = workPackages.filter((wp) => {
    if (wp.is_recurring) return wp.days_of_week.includes(tomorrowDay);
    return true;
  });

  const morningWps = relevantWps.filter((wp) => wp.shift_type === "morning");
  const eveningWps = relevantWps.filter((wp) => wp.shift_type === "evening");

  const [selections, setSelections] = useState<Record<string, ShiftSelections>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const getStaffSelections = (staffId: string): ShiftSelections =>
    selections[staffId] || { morningWps: [], eveningWps: [] };

  const addWorkPackage = (staffId: string, shift: "morning" | "evening") => {
    const items = shift === "morning" ? morningWps : eveningWps;
    if (!items.length) return;
    const key = shift === "morning" ? "morningWps" : "eveningWps";
    setSelections((prev) => {
      const current = getStaffSelectionsFrom(prev, staffId);
      const existing = current[key];
      // Find first WP not already selected
      const next = items.find((wp) => !existing.includes(wp.id));
      if (!next) return prev;
      return { ...prev, [staffId]: { ...current, [key]: [...existing, next.id] } };
    });
  };

  const removeWorkPackage = (staffId: string, shift: "morning" | "evening", wpId: string) => {
    const key = shift === "morning" ? "morningWps" : "eveningWps";
    setSelections((prev) => {
      const current = getStaffSelectionsFrom(prev, staffId);
      return { ...prev, [staffId]: { ...current, [key]: current[key].filter((id) => id !== wpId) } };
    });
  };

  const changeWorkPackage = (staffId: string, shift: "morning" | "evening", index: number, newWpId: string) => {
    const key = shift === "morning" ? "morningWps" : "eveningWps";
    setSelections((prev) => {
      const current = getStaffSelectionsFrom(prev, staffId);
      const updated = [...current[key]];
      updated[index] = newWpId;
      return { ...prev, [staffId]: { ...current, [key]: updated } };
    });
  };

  const getStaffSelectionsFrom = (sel: Record<string, ShiftSelections>, staffId: string): ShiftSelections =>
    sel[staffId] || { morningWps: [], eveningWps: [] };

  const getCapacity = (staffId: string, shift: "morning" | "evening") => {
    const sel = getStaffSelections(staffId);
    const wpIds = shift === "morning" ? sel.morningWps : sel.eveningWps;
    if (!wpIds.length) return null;
    let totalMins = 0;
    let taskCount = 0;
    for (const wpId of wpIds) {
      const wp = workPackages.find((w) => w.id === wpId);
      if (wp) {
        totalMins += wp.tasks.reduce((s, t) => s + (Number(t.standard_minutes) || 0), 0);
        taskCount += wp.tasks.length;
      }
    }
    const shiftMinutes = 420;
    const pct = Math.round((totalMins / shiftMinutes) * 100);
    return {
      totalMinutes: totalMins,
      shiftMinutes,
      utilizationPercent: pct,
      taskCount,
      status: pct <= 60 ? ("under" as const) : pct <= 100 ? ("balanced" as const) : ("over" as const),
    };
  };

  const alreadyAssigned = (staffId: string, shift: "morning" | "evening") =>
    existingAssignments.some((a) => a.staff_user_id === staffId && a.shift_type === shift);

  const totalPlanned = Object.values(selections).reduce(
    (sum, s) => sum + s.morningWps.length + s.eveningWps.length,
    0
  );
  const morningCount = Object.values(selections).reduce((s, sel) => s + sel.morningWps.length, 0);
  const eveningCount = Object.values(selections).reduce((s, sel) => s + sel.eveningWps.length, 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises: Promise<any>[] = [];
      for (const [staffId, shifts] of Object.entries(selections)) {
        for (const shift of ["morning", "evening"] as const) {
          const wpIds = shift === "morning" ? shifts.morningWps : shifts.eveningWps;
          for (const wpId of wpIds) {
            promises.push(
              createAssignment.mutateAsync({
                staffId,
                workPackageId: wpId,
                shiftType: shift,
                date: tomorrow,
              })
            );
          }
        }
      }
      await Promise.all(promises);
      setSaved(true);
      setSelections({});
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // error handled in mutation
    } finally {
      setSaving(false);
    }
  };

  const tomorrowFormatted = new Date(tomorrow).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (staffLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="kpi-card">
        <h2 className="font-bold mb-1 flex items-center gap-2">
          <CalendarPlus size={18} />
          תכנון משמרות — מחר ({tomorrowFormatted})
        </h2>
        <p className="text-xs text-muted-foreground">
          שבץ עובדים לחבילות עבודה. ניתן לשבץ מספר חבילות לאותה משמרת.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="kpi-card text-center">
          <Sun size={20} className="mx-auto mb-1 text-warning" />
          <p className="text-2xl font-bold">{morningCount}</p>
          <p className="text-xs text-muted-foreground">חבילות בוקר</p>
        </div>
        <div className="kpi-card text-center">
          <Moon size={20} className="mx-auto mb-1 text-info" />
          <p className="text-2xl font-bold">{eveningCount}</p>
          <p className="text-xs text-muted-foreground">חבילות ערב</p>
        </div>
      </div>

      <div className="space-y-3">
        {staff.map((s) => {
          const sel = getStaffSelections(s.id);
          return (
            <div key={s.id} className="task-card">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                  {s.avatar_initials || "?"}
                </div>
                <span className="font-semibold text-sm">{s.full_name}</span>
              </div>

              {(["morning", "evening"] as const).map((shift) => {
                if (alreadyAssigned(s.id, shift)) {
                  return (
                    <div key={shift} className="flex items-center gap-2 py-1.5 text-xs text-success font-semibold">
                      {shift === "morning" ? <Sun size={14} /> : <Moon size={14} />}
                      ✓ משובץ
                    </div>
                  );
                }

                const wpIds = shift === "morning" ? sel.morningWps : sel.eveningWps;
                const items = shift === "morning" ? morningWps : eveningWps;
                const capacity = getCapacity(s.id, shift);
                const canAddMore = items.length > wpIds.length;

                return (
                  <div key={shift} className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      {shift === "morning" ? (
                        <Sun size={14} className="text-warning" />
                      ) : (
                        <Moon size={14} className="text-info" />
                      )}
                      <span className="text-xs font-semibold">
                        {shift === "morning" ? "בוקר" : "ערב"}
                      </span>
                      {canAddMore && (
                        <button
                          onClick={() => addWorkPackage(s.id, shift)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground hover:bg-accent transition-colors border border-transparent hover:border-primary/30"
                        >
                          <Plus size={10} />
                          הוסף חבילה
                        </button>
                      )}
                    </div>

                    {/* Selected work packages */}
                    {wpIds.map((wpId, idx) => (
                      <div key={`${wpId}-${idx}`} className="flex items-center gap-1.5 mb-1.5 mr-4">
                        <select
                          value={wpId}
                          onChange={(e) => changeWorkPackage(s.id, shift, idx, e.target.value)}
                          className="text-[10px] bg-background border border-input rounded px-2 py-1 flex-1"
                        >
                          {items.map((wp) => (
                            <option key={wp.id} value={wp.id}>
                              {wp.name || wp.package_code} ({wp.package_code})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeWorkPackage(s.id, shift, wpId)}
                          className="p-0.5 rounded hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {/* Capacity indicator */}
                    {capacity && (
                      <div className="mr-4 mb-1">
                        <div className="flex items-center gap-2 text-[10px]">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                capacity.status === "over"
                                  ? "bg-destructive"
                                  : capacity.status === "balanced"
                                  ? "bg-success"
                                  : "bg-warning"
                              }`}
                              style={{ width: `${Math.min(capacity.utilizationPercent, 100)}%` }}
                            />
                          </div>
                          <span
                            className={`font-mono font-semibold ${
                              capacity.status === "over" ? "text-destructive" : "text-muted-foreground"
                            }`}
                          >
                            {capacity.totalMinutes}/{capacity.shiftMinutes} דק׳ ({capacity.taskCount} משימות)
                          </span>
                        </div>
                        {capacity.status === "over" && (
                          <div className="flex items-center gap-1 text-[10px] text-destructive mt-1">
                            <AlertTriangle size={10} />
                            חריגה של {capacity.totalMinutes - capacity.shiftMinutes} דק׳
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {saved ? (
        <div className="flex items-center justify-center gap-2 py-4 text-success font-semibold">
          <CheckCircle2 size={20} /> תכנון נשמר!
        </div>
      ) : (
        <button
          onClick={handleSave}
          disabled={totalPlanned === 0 || saving}
          className="btn-action-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          {saving ? "שומר..." : `שמור תכנון (${totalPlanned} שיבוצים)`}
        </button>
      )}
    </div>
  );
};

export default ShiftPlanningTab;
