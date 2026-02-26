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
  Package,
} from "lucide-react";
import {
  useStaffProfiles,
  useTodayAssignments,
  useCreateAssignment,
} from "@/hooks/usePropertyManagerData";
import { useWorkPackages } from "@/hooks/useWorkPackages";

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

  // Filter work packages relevant for tomorrow (recurring matching day, or one-time)
  const relevantWps = workPackages.filter((wp) => {
    if (wp.is_recurring) {
      return wp.days_of_week.includes(tomorrowDay);
    }
    return true; // one-time packages always shown
  });

  const morningWps = relevantWps.filter((wp) => wp.shift_type === "morning");
  const eveningWps = relevantWps.filter((wp) => wp.shift_type === "evening");

  const [selections, setSelections] = useState<
    Record<string, { morningWp?: string; eveningWp?: string }>
  >({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleShift = (staffId: string, shift: "morning" | "evening") => {
    setSelections((prev) => {
      const current = prev[staffId] || {};
      const wpKey = shift === "morning" ? "morningWp" : "eveningWp";
      if (current[wpKey]) {
        const next = { ...current };
        delete next[wpKey];
        return { ...prev, [staffId]: next };
      }
      const wps = shift === "morning" ? morningWps : eveningWps;
      return { ...prev, [staffId]: { ...current, [wpKey]: wps[0]?.id } };
    });
  };

  const selectWorkPackage = (staffId: string, shift: "morning" | "evening", wpId: string) => {
    const wpKey = shift === "morning" ? "morningWp" : "eveningWp";
    setSelections((prev) => ({
      ...prev,
      [staffId]: { ...prev[staffId], [wpKey]: wpId },
    }));
  };

  const isPlanned = (staffId: string, shift: "morning" | "evening") => {
    const sel = selections[staffId];
    return !!(shift === "morning" ? sel?.morningWp : sel?.eveningWp);
  };

  const getCapacity = (staffId: string, shift: "morning" | "evening") => {
    const sel = selections[staffId];
    const wpKey = shift === "morning" ? "morningWp" : "eveningWp";
    const wpId = sel?.[wpKey];
    if (!wpId) return null;
    const wp = workPackages.find((w) => w.id === wpId);
    if (!wp) return null;
    const totalMins = wp.tasks.reduce((s, t) => s + (Number(t.standard_minutes) || 0), 0);
    const shiftMinutes = 420;
    const pct = Math.round((totalMins / shiftMinutes) * 100);
    return {
      totalMinutes: totalMins,
      shiftMinutes,
      utilizationPercent: pct,
      taskCount: wp.tasks.length,
      status: pct <= 60 ? ("under" as const) : pct <= 100 ? ("balanced" as const) : ("over" as const),
    };
  };

  const alreadyAssigned = (staffId: string, shift: "morning" | "evening") =>
    existingAssignments.some((a) => a.staff_user_id === staffId && a.shift_type === shift);

  const morningCount = Object.values(selections).filter((s) => s.morningWp).length;
  const eveningCount = Object.values(selections).filter((s) => s.eveningWp).length;
  const totalPlanned = morningCount + eveningCount;

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises: Promise<any>[] = [];
      for (const [staffId, shifts] of Object.entries(selections)) {
        for (const shift of ["morning", "evening"] as const) {
          const wpKey = shift === "morning" ? "morningWp" : "eveningWp";
          if (shifts[wpKey]) {
            promises.push(
              createAssignment.mutateAsync({
                staffId,
                workPackageId: shifts[wpKey]!,
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
          שבץ עובדים לחבילות עבודה. מוצגות רק חבילות רלוונטיות ליום מחר.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="kpi-card text-center">
          <Sun size={20} className="mx-auto mb-1 text-warning" />
          <p className="text-2xl font-bold">{morningCount}</p>
          <p className="text-xs text-muted-foreground">משמרת בוקר</p>
        </div>
        <div className="kpi-card text-center">
          <Moon size={20} className="mx-auto mb-1 text-info" />
          <p className="text-2xl font-bold">{eveningCount}</p>
          <p className="text-xs text-muted-foreground">משמרת ערב</p>
        </div>
      </div>

      {/* Staff assignment cards */}
      <div className="space-y-3">
        {staff.map((s) => (
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

              const capacity = getCapacity(s.id, shift);
              const items = shift === "morning" ? morningWps : eveningWps;

              return (
                <div key={shift} className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => toggleShift(s.id, shift)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isPlanned(s.id, shift)
                          ? shift === "morning"
                            ? "bg-warning/15 text-warning border border-warning"
                            : "bg-info/15 text-info border border-info"
                          : "bg-muted text-muted-foreground hover:border-primary/50 border border-transparent"
                      }`}
                    >
                      {shift === "morning" ? <Sun size={12} /> : <Moon size={12} />}
                      {isPlanned(s.id, shift) ? <CheckCircle2 size={12} /> : <Plus size={10} />}
                      {shift === "morning" ? "בוקר" : "ערב"}
                    </button>

                    {isPlanned(s.id, shift) && items.length > 0 && (
                      <select
                        value={selections[s.id]?.[shift === "morning" ? "morningWp" : "eveningWp"] || ""}
                        onChange={(e) => selectWorkPackage(s.id, shift, e.target.value)}
                        className="text-[10px] bg-background border border-input rounded px-2 py-1 flex-1"
                      >
                        {items.map((wp) => (
                          <option key={wp.id} value={wp.id}>
                            {wp.name || wp.package_code} ({wp.package_code})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

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
                          {capacity.totalMinutes}/{capacity.shiftMinutes} דק׳
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
        ))}
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
