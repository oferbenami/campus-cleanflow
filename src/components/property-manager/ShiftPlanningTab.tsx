import { useState, useMemo } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  Sun,
  Moon,
  Plus,
  Send,
  Loader2,
} from "lucide-react";
import {
  useStaffProfiles,
  useTaskTemplates,
  useTodayAssignments,
  useCreateAssignment,
} from "@/hooks/usePropertyManagerData";
import { toast } from "@/hooks/use-toast";

const ShiftPlanningTab = () => {
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  const { data: staff = [], isLoading: staffLoading } = useStaffProfiles();
  const { data: templates = [] } = useTaskTemplates();
  const { data: existingAssignments = [] } = useTodayAssignments(tomorrow);
  const createAssignment = useCreateAssignment();

  const [selections, setSelections] = useState<
    Record<string, { morning?: string; evening?: string }>
  >({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const morningTemplates = templates.filter((t) => t.shift_type === "morning");
  const eveningTemplates = templates.filter((t) => t.shift_type === "evening");

  const toggleShift = (staffId: string, shift: "morning" | "evening") => {
    setSelections((prev) => {
      const current = prev[staffId] || {};
      if (current[shift]) {
        const next = { ...current };
        delete next[shift];
        return { ...prev, [staffId]: next };
      }
      // Auto-select first template for the shift
      const tmpl = shift === "morning" ? morningTemplates[0] : eveningTemplates[0];
      return { ...prev, [staffId]: { ...current, [shift]: tmpl?.id } };
    });
  };

  const selectTemplate = (staffId: string, shift: "morning" | "evening", templateId: string) => {
    setSelections((prev) => ({
      ...prev,
      [staffId]: { ...prev[staffId], [shift]: templateId },
    }));
  };

  const isPlanned = (staffId: string, shift: "morning" | "evening") =>
    !!selections[staffId]?.[shift];

  const alreadyAssigned = (staffId: string, shift: "morning" | "evening") =>
    existingAssignments.some(
      (a) => a.staff_user_id === staffId && a.shift_type === shift
    );

  const morningCount = Object.values(selections).filter((s) => s.morning).length;
  const eveningCount = Object.values(selections).filter((s) => s.evening).length;
  const totalPlanned = morningCount + eveningCount;

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises: Promise<any>[] = [];
      for (const [staffId, shifts] of Object.entries(selections)) {
        if (shifts.morning) {
          promises.push(
            createAssignment.mutateAsync({
              staffId,
              templateId: shifts.morning,
              shiftType: "morning",
              date: tomorrow,
            })
          );
        }
        if (shifts.evening) {
          promises.push(
            createAssignment.mutateAsync({
              staffId,
              templateId: shifts.evening,
              shiftType: "evening",
              date: tomorrow,
            })
          );
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
        <p className="text-xs text-muted-foreground">סמן עובדים למשמרת בוקר ו/או ערב ובחר תבנית</p>
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

      <div className="task-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right">
              <th className="py-2 px-3 text-xs text-muted-foreground font-medium">עובד</th>
              <th className="py-2 px-3 text-xs text-muted-foreground font-medium text-center">
                <span className="flex items-center justify-center gap-1"><Sun size={14} /> בוקר</span>
              </th>
              <th className="py-2 px-3 text-xs text-muted-foreground font-medium text-center">
                <span className="flex items-center justify-center gap-1"><Moon size={14} /> ערב</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-b border-border/50">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                      {s.avatar_initials || "?"}
                    </div>
                    <span className="font-medium">{s.full_name}</span>
                  </div>
                </td>
                {(["morning", "evening"] as const).map((shift) => (
                  <td key={shift} className="py-3 px-3 text-center">
                    {alreadyAssigned(s.id, shift) ? (
                      <span className="text-xs text-success font-semibold">✓ משובץ</span>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => toggleShift(s.id, shift)}
                          className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isPlanned(s.id, shift)
                              ? shift === "morning"
                                ? "border-warning bg-warning/15 text-warning"
                                : "border-info bg-info/15 text-info"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {isPlanned(s.id, shift) ? <CheckCircle2 size={20} /> : <Plus size={16} />}
                        </button>
                        {isPlanned(s.id, shift) && (
                          <select
                            value={selections[s.id]?.[shift] || ""}
                            onChange={(e) => selectTemplate(s.id, shift, e.target.value)}
                            className="text-[10px] bg-background border border-input rounded px-1 py-0.5 w-24"
                          >
                            {(shift === "morning" ? morningTemplates : eveningTemplates).map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
