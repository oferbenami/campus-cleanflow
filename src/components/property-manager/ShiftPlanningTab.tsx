import { useState, useMemo } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  Sun,
  Moon,
  Plus,
  Send,
  Loader2,
  Zap,
  AlertTriangle,
  Package,
} from "lucide-react";
import {
  useStaffProfiles,
  useTaskTemplates,
  useTodayAssignments,
  useCreateAssignment,
} from "@/hooks/usePropertyManagerData";
import { useWorkPackages } from "@/hooks/useWorkPackages";
import { calculateCapacity } from "@/lib/task-generation";

type AssignMode = "template" | "workpackage";

const ShiftPlanningTab = () => {
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  const weekday = new Date(tomorrow).getDay();

  const { data: staff = [], isLoading: staffLoading } = useStaffProfiles();
  const { data: baseTemplates = [] } = useTaskTemplates("base");
  const { data: addonTemplates = [] } = useTaskTemplates("addon");
  const { data: workPackages = [] } = useWorkPackages();
  const { data: existingAssignments = [] } = useTodayAssignments(tomorrow);
  const createAssignment = useCreateAssignment();

  const [assignMode, setAssignMode] = useState<AssignMode>("workpackage");
  const [selections, setSelections] = useState<
    Record<string, { morning?: string; evening?: string; addons?: Record<string, string[]>; morningWp?: string; eveningWp?: string }>
  >({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const morningBases = baseTemplates.filter((t) => t.shift_type === "morning");
  const eveningBases = baseTemplates.filter((t) => t.shift_type === "evening");
  const morningAddons = addonTemplates.filter((t) => t.shift_type === "morning" || t.shift_type === "any");
  const eveningAddons = addonTemplates.filter((t) => t.shift_type === "evening" || t.shift_type === "any");
  const morningWps = workPackages.filter((wp) => wp.shift_type === "morning");
  const eveningWps = workPackages.filter((wp) => wp.shift_type === "evening");

  const toggleShift = (staffId: string, shift: "morning" | "evening") => {
    setSelections((prev) => {
      const current = prev[staffId] || {};
      if (assignMode === "workpackage") {
        const wpKey = shift === "morning" ? "morningWp" : "eveningWp";
        if (current[wpKey]) {
          const next = { ...current };
          delete next[wpKey];
          return { ...prev, [staffId]: next };
        }
        const wps = shift === "morning" ? morningWps : eveningWps;
        return { ...prev, [staffId]: { ...current, [wpKey]: wps[0]?.id } };
      } else {
        if (current[shift]) {
          const next = { ...current };
          delete next[shift];
          return { ...prev, [staffId]: next };
        }
        const tmpl = shift === "morning" ? morningBases[0] : eveningBases[0];
        return { ...prev, [staffId]: { ...current, [shift]: tmpl?.id } };
      }
    });
  };

  const selectTemplate = (staffId: string, shift: "morning" | "evening", templateId: string) => {
    setSelections((prev) => ({
      ...prev,
      [staffId]: { ...prev[staffId], [shift]: templateId },
    }));
  };

  const selectWorkPackage = (staffId: string, shift: "morning" | "evening", wpId: string) => {
    const wpKey = shift === "morning" ? "morningWp" : "eveningWp";
    setSelections((prev) => ({
      ...prev,
      [staffId]: { ...prev[staffId], [wpKey]: wpId },
    }));
  };

  const toggleAddon = (staffId: string, shift: "morning" | "evening", addonId: string) => {
    setSelections((prev) => {
      const current = prev[staffId] || {};
      const addons = current.addons || {};
      const shiftAddons = addons[shift] || [];
      const updated = shiftAddons.includes(addonId)
        ? shiftAddons.filter((id) => id !== addonId)
        : [...shiftAddons, addonId];
      return {
        ...prev,
        [staffId]: { ...current, addons: { ...addons, [shift]: updated } },
      };
    });
  };

  const isPlanned = (staffId: string, shift: "morning" | "evening") => {
    const sel = selections[staffId];
    if (!sel) return false;
    if (assignMode === "workpackage") {
      return !!(shift === "morning" ? sel.morningWp : sel.eveningWp);
    }
    return !!sel[shift];
  };

  const getWpCapacity = (staffId: string, shift: "morning" | "evening") => {
    const sel = selections[staffId];
    const wpKey = shift === "morning" ? "morningWp" : "eveningWp";
    const wpId = sel?.[wpKey];
    if (!wpId) return null;
    const wp = workPackages.find((w) => w.id === wpId);
    if (!wp) return null;
    const totalMins = wp.tasks.reduce((s, t) => s + (Number(t.standard_minutes) || 0), 0);
    const shiftMinutes = 420;
    const pct = Math.round((totalMins / shiftMinutes) * 100);
    return { totalMinutes: totalMins, shiftMinutes, utilizationPercent: pct, taskCount: wp.tasks.length, status: pct <= 60 ? "under" as const : pct <= 100 ? "balanced" as const : "over" as const };
  };

  const getCapacity = (staffId: string, shift: "morning" | "evening") => {
    if (assignMode === "workpackage") return getWpCapacity(staffId, shift);
    const sel = selections[staffId];
    if (!sel?.[shift]) return null;
    const baseId = sel[shift];
    const base = baseTemplates.find((t) => t.id === baseId);
    if (!base) return null;
    const addonIds = sel.addons?.[shift] || [];
    const addonTasksList = addonTemplates.filter((t) => addonIds.includes(t.id)).flatMap((t) => t.tasks);
    return calculateCapacity(base.tasks, addonTasksList, weekday);
  };

  const alreadyAssigned = (staffId: string, shift: "morning" | "evening") =>
    existingAssignments.some((a) => a.staff_user_id === staffId && a.shift_type === shift);

  const morningCount = Object.values(selections).filter((s) => assignMode === "workpackage" ? s.morningWp : s.morning).length;
  const eveningCount = Object.values(selections).filter((s) => assignMode === "workpackage" ? s.eveningWp : s.evening).length;
  const totalPlanned = morningCount + eveningCount;

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises: Promise<any>[] = [];
      for (const [staffId, shifts] of Object.entries(selections)) {
        for (const shift of ["morning", "evening"] as const) {
          if (assignMode === "workpackage") {
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
          } else {
            if (shifts[shift]) {
              promises.push(
                createAssignment.mutateAsync({
                  staffId,
                  templateId: shifts[shift]!,
                  shiftType: shift,
                  date: tomorrow,
                  addonTemplateIds: shifts.addons?.[shift] || [],
                })
              );
            }
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

  const tomorrowFormatted = new Date(tomorrow).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });

  if (staffLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded-xl" />)}
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
        <p className="text-xs text-muted-foreground">שבץ עובדים לחבילת עבודה או תבנית בסיס</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        <button
          onClick={() => { setAssignMode("workpackage"); setSelections({}); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
            assignMode === "workpackage" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Package size={14} /> חבילות עבודה
        </button>
        <button
          onClick={() => { setAssignMode("template"); setSelections({}); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
            assignMode === "template" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Zap size={14} /> תבניות
        </button>
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
              const items = assignMode === "workpackage"
                ? (shift === "morning" ? morningWps : eveningWps)
                : (shift === "morning" ? morningBases : eveningBases);
              const addons = assignMode === "template" ? (shift === "morning" ? morningAddons : eveningAddons) : [];

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
                        value={
                          assignMode === "workpackage"
                            ? (selections[s.id]?.[shift === "morning" ? "morningWp" : "eveningWp"] || "")
                            : (selections[s.id]?.[shift] || "")
                        }
                        onChange={(e) =>
                          assignMode === "workpackage"
                            ? selectWorkPackage(s.id, shift, e.target.value)
                            : selectTemplate(s.id, shift, e.target.value)
                        }
                        className="text-[10px] bg-background border border-input rounded px-2 py-1 flex-1"
                      >
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {"name" in item ? item.name : ""} {"package_code" in item ? `(${(item as any).package_code})` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Add-ons selection (template mode only) */}
                  {assignMode === "template" && isPlanned(s.id, shift) && addons.length > 0 && (
                    <div className="mr-4 space-y-1 mb-2">
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Zap size={10} /> תוספות:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {addons.map((addon) => {
                          const isSelected = selections[s.id]?.addons?.[shift]?.includes(addon.id);
                          return (
                            <button
                              key={addon.id}
                              onClick={() => toggleAddon(s.id, shift, addon.id)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                                isSelected
                                  ? "bg-warning/15 text-warning border border-warning"
                                  : "bg-muted text-muted-foreground border border-transparent hover:border-warning/30"
                              }`}
                            >
                              {isSelected ? "✓ " : ""}{addon.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

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
                        <span className={`font-mono font-semibold ${
                          capacity.status === "over" ? "text-destructive" : "text-muted-foreground"
                        }`}>
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
