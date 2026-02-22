import { useState, useMemo, useCallback } from "react";
import {
  AlertTriangle,
  MapPin,
  Plus,
  Trash2,
  UserPlus,
  ClipboardList,
  Send,
  CheckCircle2,
  Sun,
  Moon,
  Clock,
  Save,
  X,
} from "lucide-react";
import { mockStaff, mockTasks, mockZones, type TaskTemplate } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

type TaskMode = "template" | "oneTime";

interface PlannedTask {
  id: string;
  task: TaskTemplate;
  assignedStaffId: string | null;
  mode: TaskMode;
  plannedStart: string;
  plannedEnd: string;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const shiftStart: Record<string, string> = { morning: "07:00", evening: "16:00" };

const ZonePlanningTab = () => {
  const staffOnly = mockStaff.filter((s) => s.role === "staff");
  const [shift, setShift] = useState<"morning" | "evening">("morning");
  const [sent, setSent] = useState(false);

  const buildInitialTasks = useCallback((s: "morning" | "evening"): PlannedTask[] => {
    const tasks = mockTasks.filter((t) => t.shift === s);
    let cursor = shiftStart[s];
    return tasks.map((t, i) => {
      const start = cursor;
      const end = addMinutes(start, t.estimatedMinutes);
      cursor = addMinutes(end, 5);
      return { id: `pt-${i}`, task: t, assignedStaffId: null, mode: "template" as TaskMode, plannedStart: start, plannedEnd: end };
    });
  }, []);

  const [plannedTasks, setPlannedTasks] = useState<PlannedTask[]>(() => buildInitialTasks("morning"));

  const handleShiftChange = (newShift: "morning" | "evening") => {
    setShift(newShift);
    setPlannedTasks(buildInitialTasks(newShift));
  };

  const assignStaff = (taskId: string, staffId: string) =>
    setPlannedTasks((prev) => prev.map((pt) => pt.id === taskId ? { ...pt, assignedStaffId: staffId || null } : pt));

  const removeTask = (id: string) => setPlannedTasks((prev) => prev.filter((pt) => pt.id !== id));

  const unassignedCount = plannedTasks.filter((pt) => !pt.assignedStaffId).length;

  const handleSend = () => {
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {unassignedCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border-2 border-destructive/30">
          <AlertTriangle size={22} className="text-destructive shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm text-destructive">{unassignedCount} משימות לא שובצו!</p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => handleShiftChange("morning")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${shift === "morning" ? "bg-warning/15 border-2 border-warning text-warning" : "bg-muted border-2 border-transparent text-muted-foreground"}`}>
          <Sun size={18} /> משמרת בוקר
        </button>
        <button onClick={() => handleShiftChange("evening")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${shift === "evening" ? "bg-info/15 border-2 border-info text-info" : "bg-muted border-2 border-transparent text-muted-foreground"}`}>
          <Moon size={18} /> משמרת ערב
        </button>
      </div>

      <div className="space-y-2">
        {plannedTasks.map((pt, idx) => {
          const staff = staffOnly.find((s) => s.id === pt.assignedStaffId);
          return (
            <div key={pt.id} className="task-card flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-1 shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm truncate">{pt.task.name}</p>
                  <button onClick={() => removeTask(pt.id)} className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <MapPin size={11} />
                  <span>{pt.task.zone.name}</span>
                  <span>·</span>
                  <Clock size={11} />
                  <span className="mono">{pt.plannedStart}–{pt.plannedEnd}</span>
                  <span>·</span>
                  <span>{pt.task.estimatedMinutes} דק׳</span>
                </div>
                <select
                  value={pt.assignedStaffId || ""}
                  onChange={(e) => assignStaff(pt.id, e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">בחר עובד...</option>
                  {staffOnly.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {sent ? (
        <div className="flex items-center justify-center gap-2 py-4 text-success font-semibold">
          <CheckCircle2 size={20} /> שיבוץ נשלח!
        </div>
      ) : (
        <button
          onClick={handleSend}
          disabled={unassignedCount > 0}
          className="btn-action-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={18} /> שלח שיבוץ
        </button>
      )}
    </div>
  );
};

export default ZonePlanningTab;
