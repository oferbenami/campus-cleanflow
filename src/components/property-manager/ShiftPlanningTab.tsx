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
  ChevronDown,
  ChevronUp,
  Package,
  Users,
} from "lucide-react";
import {
  useStaffProfiles,
  useTodayAssignments,
  useCreateAssignment,
} from "@/hooks/usePropertyManagerData";
import { useWorkPackages } from "@/hooks/useWorkPackages";
import DailySummaryTable from "./DailySummaryTable";

interface ShiftSelections {
  morningWps: string[];
  eveningWps: string[];
}

type Phase = "staff" | "assign";

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

  // Phase 1: staff availability per shift
  const [staffShifts, setStaffShifts] = useState<Record<string, { morning: boolean; evening: boolean }>>({});
  // Phase 2: WP assignments
  const [selections, setSelections] = useState<Record<string, ShiftSelections>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [phase, setPhase] = useState<Phase>("staff");
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [expandedStaff, setExpandedStaff] = useState<Record<string, boolean>>({});

  const toggleExpanded = (staffId: string) =>
    setExpandedStaff((prev) => ({ ...prev, [staffId]: !prev[staffId] }));

  const getStaffShift = (staffId: string) =>
    staffShifts[staffId] || { morning: false, evening: false };

  const toggleStaffShift = (staffId: string, shift: "morning" | "evening") => {
    setStaffShifts((prev) => {
      const current = prev[staffId] || { morning: false, evening: false };
      return { ...prev, [staffId]: { ...current, [shift]: !current[shift] } };
    });
  };

  const activeStaff = useMemo(
    () => staff.filter((s) => {
      const sh = getStaffShift(s.id);
      return sh.morning || sh.evening;
    }),
    [staff, staffShifts]
  );

  const canProceedToAssign = activeStaff.length > 0;

  // WP assignment helpers
  const getStaffSelections = (staffId: string): ShiftSelections =>
    selections[staffId] || { morningWps: [], eveningWps: [] };

  const getStaffSelectionsFrom = (sel: Record<string, ShiftSelections>, staffId: string): ShiftSelections =>
    sel[staffId] || { morningWps: [], eveningWps: [] };

  const addWorkPackage = (staffId: string, shift: "morning" | "evening") => {
    const items = shift === "morning" ? morningWps : eveningWps;
    if (!items.length) return;
    const key = shift === "morning" ? "morningWps" : "eveningWps";
    setSelections((prev) => {
      const current = getStaffSelectionsFrom(prev, staffId);
      const existing = current[key];
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

  // KPI: WP coverage banner
  const assignedWpIds = useMemo(() => {
    const ids = new Set<string>();
    // From selections
    for (const sel of Object.values(selections)) {
      for (const id of sel.morningWps) ids.add(id);
      for (const id of sel.eveningWps) ids.add(id);
    }
    // From existing assignments
    for (const a of existingAssignments) {
      if (a.work_package_id) ids.add(a.work_package_id);
    }
    return ids;
  }, [selections, existingAssignments]);

  const totalRelevant = relevantWps.length;
  const totalAssigned = relevantWps.filter((wp) => assignedWpIds.has(wp.id)).length;
  const totalRemaining = totalRelevant - totalAssigned;

  const unassignedWps = relevantWps.filter((wp) => !assignedWpIds.has(wp.id));

  // Duplicate alerts
  const duplicateAlerts = useMemo(() => {
    const alerts: { wpId: string; wpName: string; shift: string; staffNames: string[] }[] = [];
    for (const shift of ["morning", "evening"] as const) {
      const wpToStaff: Record<string, string[]> = {};
      for (const [staffId, sel] of Object.entries(selections)) {
        const wpIds = shift === "morning" ? sel.morningWps : sel.eveningWps;
        for (const wpId of wpIds) {
          if (!wpToStaff[wpId]) wpToStaff[wpId] = [];
          const s = staff.find((st) => st.id === staffId);
          wpToStaff[wpId].push(s?.full_name || staffId);
        }
      }
      for (const a of existingAssignments) {
        if (a.shift_type === shift && a.work_package_id) {
          if (!wpToStaff[a.work_package_id]) wpToStaff[a.work_package_id] = [];
          const s = staff.find((st) => st.id === a.staff_user_id);
          wpToStaff[a.work_package_id].push(s?.full_name || a.staff_user_id);
        }
      }
      for (const [wpId, names] of Object.entries(wpToStaff)) {
        if (names.length > 1) {
          const wp = workPackages.find((w) => w.id === wpId);
          alerts.push({
            wpId,
            wpName: wp?.name || wp?.package_code || wpId,
            shift: shift === "morning" ? "בוקר" : "ערב",
            staffNames: names,
          });
        }
      }
    }
    return alerts;
  }, [selections, existingAssignments, staff, workPackages]);

  const totalPlanned = Object.values(selections).reduce(
    (sum, s) => sum + s.morningWps.length + s.eveningWps.length,
    0
  );

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

  const morningStaffCount = Object.values(staffShifts).filter((s) => s.morning).length;
  const eveningStaffCount = Object.values(staffShifts).filter((s) => s.evening).length;

  return (
    <div className="space-y-4 animate-slide-up">
      {/* ─── Sticky KPI Banner ─── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border pb-3 -mx-1 px-1">
        <div className="kpi-card">
          <h2 className="font-bold mb-2 flex items-center gap-2">
            <CalendarPlus size={18} />
            תכנון משמרות — מחר ({tomorrowFormatted})
          </h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-lg font-bold">{totalRelevant}</p>
              <p className="text-[10px] text-muted-foreground">חבילות רלוונטיות</p>
            </div>
            <div className="rounded-lg bg-success/10 p-2">
              <p className="text-lg font-bold text-success">{totalAssigned}</p>
              <p className="text-[10px] text-muted-foreground">שובצו</p>
            </div>
            <div
              className={`rounded-lg p-2 cursor-pointer transition-colors ${
                totalRemaining > 0 ? "bg-warning/10 hover:bg-warning/20" : "bg-success/10"
              }`}
              onClick={() => totalRemaining > 0 && setShowUnassigned((v) => !v)}
            >
              <p className={`text-lg font-bold ${totalRemaining > 0 ? "text-warning" : "text-success"}`}>
                {totalRemaining}
              </p>
              <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                נותרו
                {totalRemaining > 0 && (
                  showUnassigned ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                )}
              </p>
            </div>
          </div>

          {/* Drill-down: unassigned WPs */}
          {showUnassigned && unassignedWps.length > 0 && (
            <div className="mt-3 border-t border-border pt-3 space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                <Package size={12} /> חבילות שטרם שובצו:
              </p>
              {unassignedWps.map((wp) => (
                <div
                  key={wp.id}
                  className="flex items-center justify-between text-xs bg-muted/30 rounded-lg px-3 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    {wp.shift_type === "morning" ? (
                      <Sun size={12} className="text-warning" />
                    ) : (
                      <Moon size={12} className="text-info" />
                    )}
                    <span className="font-medium">{wp.name || wp.package_code}</span>
                  </div>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    {wp.tasks.reduce((s, t) => s + (Number(t.standard_minutes) || 0), 0)} דק׳
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Phase Tabs ─── */}
      <div className="flex gap-2">
        <button
          onClick={() => setPhase("staff")}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            phase === "staff"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          <Users size={14} />
          שלב 1: מצבת עובדים ({morningStaffCount + eveningStaffCount})
        </button>
        <button
          onClick={() => canProceedToAssign && setPhase("assign")}
          disabled={!canProceedToAssign}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            phase === "assign"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          <Package size={14} />
          שלב 2: שיבוץ חבילות
        </button>
      </div>

      {/* ─── Phase 1: Staff Availability ─── */}
      {phase === "staff" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            סמן לכל עובד באיזו משמרת הוא עובד מחר.
          </p>
          {staff.map((s) => {
            const sh = getStaffShift(s.id);
            const mAssigned = alreadyAssigned(s.id, "morning");
            const eAssigned = alreadyAssigned(s.id, "evening");
            return (
              <div key={s.id} className="task-card flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                  {s.avatar_initials || "?"}
                </div>
                <span className="font-semibold text-sm flex-1 min-w-0 truncate">{s.full_name}</span>
                <div className="flex gap-1.5 shrink-0">
                  {mAssigned ? (
                    <span className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-success/15 text-success flex items-center gap-1">
                      <Sun size={12} /> ✓
                    </span>
                  ) : (
                    <button
                      onClick={() => toggleStaffShift(s.id, "morning")}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all border ${
                        sh.morning
                          ? "bg-warning/15 text-warning border-warning/40"
                          : "bg-muted text-muted-foreground border-transparent hover:border-warning/30"
                      }`}
                    >
                      <Sun size={12} /> בוקר
                    </button>
                  )}
                  {eAssigned ? (
                    <span className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-success/15 text-success flex items-center gap-1">
                      <Moon size={12} /> ✓
                    </span>
                  ) : (
                    <button
                      onClick={() => toggleStaffShift(s.id, "evening")}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all border ${
                        sh.evening
                          ? "bg-info/15 text-info border-info/40"
                          : "bg-muted text-muted-foreground border-transparent hover:border-info/30"
                      }`}
                    >
                      <Moon size={12} /> ערב
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {canProceedToAssign && (
            <button
              onClick={() => setPhase("assign")}
              className="btn-action-primary w-full flex items-center justify-center gap-2"
            >
              המשך לשיבוץ חבילות <Package size={16} />
            </button>
          )}
        </div>
      )}

      {/* ─── Phase 2: WP Assignment ─── */}
      {phase === "assign" && (
        <div className="space-y-4">
          {duplicateAlerts.length > 0 && (
            <div className="space-y-2">
              {duplicateAlerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    <strong>{alert.wpName}</strong> ({alert.shift}) משובצת ל-{alert.staffNames.length} עובדים: {alert.staffNames.join(", ")}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Morning Shift Section ── */}
          {(() => {
            const morningStaff = activeStaff.filter(
              (s) => getStaffShift(s.id).morning && !alreadyAssigned(s.id, "morning")
            );
            const eveningStaff = activeStaff.filter(
              (s) => getStaffShift(s.id).evening && !alreadyAssigned(s.id, "evening")
            );

            const renderStaffRow = (s: typeof staff[0], shift: "morning" | "evening") => {
              const key = `${s.id}-${shift}`;
              const isExpanded = expandedStaff[key] || false;
              const sel = getStaffSelections(s.id);
              const wpIds = shift === "morning" ? sel.morningWps : sel.eveningWps;
              const items = shift === "morning" ? morningWps : eveningWps;
              const capacity = getCapacity(s.id, shift);

              // WPs not yet selected by this staff member for this shift
              const availableWps = items.filter((wp) => !wpIds.includes(wp.id));

              return (
                <div key={key} className="task-card">
                  <button
                    onClick={() => toggleExpanded(key)}
                    className="w-full flex items-center gap-2 text-right"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                      {s.avatar_initials || "?"}
                    </div>
                    <span className="font-semibold text-sm flex-1 text-right truncate">{s.full_name}</span>
                    {wpIds.length > 0 && (
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                        {wpIds.length} חבילות
                      </span>
                    )}
                    {isExpanded ? <ChevronUp size={14} className="text-muted-foreground shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-2">
                      {/* Selected WPs */}
                      {wpIds.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold text-muted-foreground">חבילות שנבחרו:</p>
                          {wpIds.map((wpId) => {
                            const wp = workPackages.find((w) => w.id === wpId);
                            return (
                              <div key={wpId} className="flex items-center justify-between bg-success/10 rounded-lg px-3 py-1.5 text-xs">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 size={12} className="text-success" />
                                  <span className="font-medium">{wp?.name || wp?.package_code || wpId}</span>
                                </div>
                                <button
                                  onClick={() => removeWorkPackage(s.id, shift, wpId)}
                                  className="p-0.5 rounded hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-colors"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Available WPs to select */}
                      {availableWps.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold text-muted-foreground">חבילות זמינות לשיבוץ:</p>
                          {availableWps.map((wp) => (
                            <button
                              key={wp.id}
                              onClick={() => {
                                const wpKey = shift === "morning" ? "morningWps" : "eveningWps";
                                setSelections((prev) => {
                                  const current = getStaffSelectionsFrom(prev, s.id);
                                  return { ...prev, [s.id]: { ...current, [wpKey]: [...current[wpKey], wp.id] } };
                                });
                              }}
                              className="w-full flex items-center justify-between bg-muted/30 hover:bg-accent rounded-lg px-3 py-1.5 text-xs transition-colors border border-transparent hover:border-primary/30"
                            >
                              <div className="flex items-center gap-2">
                                <Plus size={12} className="text-primary" />
                                <span className="font-medium">{wp.name || wp.package_code}</span>
                              </div>
                              <span className="text-muted-foreground font-mono text-[10px]">
                                {wp.tasks.reduce((sum, t) => sum + (Number(t.standard_minutes) || 0), 0)} דק׳
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Capacity bar */}
                      {capacity && (
                        <div className="mt-2">
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
                  )}
                </div>
              );
            };

            return (
              <>
                {morningStaff.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-warning">
                      <Sun size={14} />
                      <span>משמרת בוקר ({morningStaff.length} עובדים)</span>
                    </div>
                    {morningStaff.map((s) => renderStaffRow(s, "morning"))}
                  </div>
                )}

                {eveningStaff.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-info">
                      <Moon size={14} />
                      <span>משמרת ערב ({eveningStaff.length} עובדים)</span>
                    </div>
                    {eveningStaff.map((s) => renderStaffRow(s, "evening"))}
                  </div>
                )}
              </>
            );
          })()}

          <DailySummaryTable
            staff={staff}
            workPackages={workPackages}
            existingAssignments={existingAssignments}
            selections={selections}
            tomorrowFormatted={tomorrowFormatted}
          />

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
      )}
    </div>
  );
};

export default ShiftPlanningTab;
