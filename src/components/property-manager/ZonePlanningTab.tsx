import { useState, useMemo } from "react";
import {
  AlertTriangle,
  MapPin,
  Trash2,
  Send,
  CheckCircle2,
  Sun,
  Moon,
  Clock,
  Loader2,
} from "lucide-react";
import {
  useStaffProfiles,
  useTaskTemplates,
  useTodayAssignments,
  useCreateAssignment,
} from "@/hooks/usePropertyManagerData";

const ZonePlanningTab = () => {
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const { data: staff = [], isLoading: staffLoading } = useStaffProfiles();
  const { data: templates = [] } = useTaskTemplates();
  const { data: existingAssignments = [] } = useTodayAssignments(today);
  const createAssignment = useCreateAssignment();

  const [shift, setShift] = useState<"morning" | "evening">("morning");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [assignments, setAssignments] = useState<Record<string, string>>({}); // templateId -> staffId
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);

  const filteredTemplates = templates.filter((t) => t.shift_type === shift);
  const currentTemplate = filteredTemplates.find((t) => t.id === selectedTemplate) || filteredTemplates[0];

  const handleShiftChange = (s: "morning" | "evening") => {
    setShift(s);
    setSelectedTemplate("");
    setAssignments({});
  };

  const assignStaff = (templateId: string, staffId: string) => {
    setAssignments((prev) => ({ ...prev, [templateId]: staffId || "" }));
  };

  const unassignedCount = filteredTemplates.filter((t) => {
    const alreadyExists = existingAssignments.some(
      (a) => a.template_id === t.id && a.shift_type === shift
    );
    return !alreadyExists && !assignments[t.id];
  }).length;

  const handleSend = async () => {
    setSaving(true);
    try {
      const promises = Object.entries(assignments)
        .filter(([, staffId]) => staffId)
        .map(([templateId, staffId]) =>
          createAssignment.mutateAsync({
            staffId,
            templateId,
            shiftType: shift,
            date: today,
          })
        );
      await Promise.all(promises);
      setSent(true);
      setAssignments({});
      setTimeout(() => setSent(false), 2500);
    } catch {
      // handled by mutation
    } finally {
      setSaving(false);
    }
  };

  if (staffLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up">
      {unassignedCount > 0 && filteredTemplates.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border-2 border-destructive/30">
          <AlertTriangle size={22} className="text-destructive shrink-0" />
          <p className="font-bold text-sm text-destructive">{unassignedCount} תבניות לא שובצו!</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => handleShiftChange("morning")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            shift === "morning"
              ? "bg-warning/15 border-2 border-warning text-warning"
              : "bg-muted border-2 border-transparent text-muted-foreground"
          }`}
        >
          <Sun size={18} /> משמרת בוקר
        </button>
        <button
          onClick={() => handleShiftChange("evening")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            shift === "evening"
              ? "bg-info/15 border-2 border-info text-info"
              : "bg-muted border-2 border-transparent text-muted-foreground"
          }`}
        >
          <Moon size={18} /> משמרת ערב
        </button>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">אין תבניות למשמרת זו</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTemplates.map((tmpl, idx) => {
            const totalMinutes = tmpl.tasks.reduce((sum, t) => sum + t.standard_minutes, 0);
            const alreadyExists = existingAssignments.some(
              (a) => a.template_id === tmpl.id && a.shift_type === shift
            );
            return (
              <div key={tmpl.id} className="task-card">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-1 shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm mb-1">{tmpl.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Clock size={11} />
                      <span>{totalMinutes} דק׳ · {tmpl.tasks.length} משימות</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {tmpl.tasks.map((t) => (
                        <span key={t.id} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {t.task_name} ({t.standard_minutes}′)
                        </span>
                      ))}
                    </div>
                    {alreadyExists ? (
                      <span className="text-xs text-success font-semibold">✓ כבר שובץ היום</span>
                    ) : (
                      <select
                        value={assignments[tmpl.id] || ""}
                        onChange={(e) => assignStaff(tmpl.id, e.target.value)}
                        className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">בחר עובד...</option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>{s.full_name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sent ? (
        <div className="flex items-center justify-center gap-2 py-4 text-success font-semibold">
          <CheckCircle2 size={20} /> שיבוץ נשלח!
        </div>
      ) : (
        <button
          onClick={handleSend}
          disabled={unassignedCount > 0 || filteredTemplates.length === 0 || saving}
          className="btn-action-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          {saving ? "שולח..." : "שלח שיבוץ"}
        </button>
      )}
    </div>
  );
};

export default ZonePlanningTab;
