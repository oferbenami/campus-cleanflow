import { useState, useMemo } from "react";
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
  Filter,
  Star,
  CalendarDays,
} from "lucide-react";
import { mockStaff, mockTasks, mockZones, mockAssignments, type TaskTemplate } from "@/data/mockData";

type TaskMode = "template" | "oneTime";

interface PlannedTask {
  id: string;
  task: TaskTemplate;
  assignedStaffId: string | null;
  mode: TaskMode; // permanent template or one-time daily
}

const ZonePlanningTab = () => {
  const staffOnly = mockStaff.filter((s) => s.role === "staff");
  const [shift, setShift] = useState<"morning" | "evening">("morning");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [sent, setSent] = useState(false);

  // Unique wings/floors for filtering
  const wings = [...new Set(mockZones.map((z) => z.wing))];
  const floors = [...new Set(mockZones.map((z) => z.floor))];

  // Tasks seeded from zone-based templates + ability to add
  const [plannedTasks, setPlannedTasks] = useState<PlannedTask[]>(() => {
    // Seed from existing mock tasks for this shift
    return mockTasks
      .filter((t) => t.shift === shift)
      .map((t, i) => ({
        id: `pt-${i}`,
        task: t,
        assignedStaffId: null,
        mode: "template" as TaskMode,
      }));
  });

  // Re-seed when shift changes
  const handleShiftChange = (newShift: "morning" | "evening") => {
    setShift(newShift);
    setPlannedTasks(
      mockTasks
        .filter((t) => t.shift === newShift)
        .map((t, i) => ({
          id: `pt-${i}`,
          task: t,
          assignedStaffId: null,
          mode: "template" as TaskMode,
        }))
    );
  };

  // Adding a new task
  const [addTaskId, setAddTaskId] = useState("");
  const [addMode, setAddMode] = useState<TaskMode>("template");

  const shiftTasks = mockTasks.filter((t) => t.shift === shift);
  const availableToAdd = shiftTasks.filter(
    (t) => !plannedTasks.some((pt) => pt.task.id === t.id)
  );

  const addTask = () => {
    if (!addTaskId) return;
    const task = mockTasks.find((t) => t.id === addTaskId);
    if (!task) return;
    setPlannedTasks((prev) => [
      ...prev,
      { id: `pt-${Date.now()}`, task, assignedStaffId: null, mode: addMode },
    ]);
    setAddTaskId("");
  };

  const removeTask = (id: string) => {
    setPlannedTasks((prev) => prev.filter((pt) => pt.id !== id));
  };

  const assignStaff = (taskId: string, staffId: string) => {
    setPlannedTasks((prev) =>
      prev.map((pt) =>
        pt.id === taskId ? { ...pt, assignedStaffId: staffId || null } : pt
      )
    );
  };

  // Filtered tasks by zone
  const filteredTasks = useMemo(() => {
    if (zoneFilter === "all") return plannedTasks;
    // Filter by wing or floor
    if (zoneFilter.startsWith("wing-")) {
      const wing = zoneFilter.replace("wing-", "");
      return plannedTasks.filter((pt) => pt.task.zone.wing === wing);
    }
    if (zoneFilter.startsWith("floor-")) {
      const floor = zoneFilter.replace("floor-", "");
      return plannedTasks.filter((pt) => pt.task.zone.floor === floor);
    }
    return plannedTasks.filter((pt) => pt.task.zone.id === zoneFilter);
  }, [plannedTasks, zoneFilter]);

  // Unassigned count
  const unassignedTasks = plannedTasks.filter((pt) => !pt.assignedStaffId);
  const unassignedCount = unassignedTasks.length;

  const handleSend = () => {
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Unassigned tasks banner */}
      {unassignedCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border-2 border-destructive/30 animate-pulse-slow">
          <AlertTriangle size={22} className="text-destructive shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm text-destructive">
              {unassignedCount} משימות לא שובצו!
            </p>
            <p className="text-xs text-destructive/80">
              יש לשבץ עובדים לכל המשימות לפני תחילת המשמרת
            </p>
          </div>
          <span className="text-2xl font-bold text-destructive mono">{unassignedCount}</span>
        </div>
      )}

      {/* Shift toggle */}
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

      {/* Zone filter */}
      <div className="task-card">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-muted-foreground" />
          <span className="text-sm font-semibold">סינון לפי אזור</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setZoneFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              zoneFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            הכל ({plannedTasks.length})
          </button>
          {wings.map((w) => {
            const count = plannedTasks.filter((pt) => pt.task.zone.wing === w).length;
            if (count === 0) return null;
            return (
              <button
                key={w}
                onClick={() => setZoneFilter(`wing-${w}`)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  zoneFilter === `wing-${w}`
                    ? "bg-info text-info-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                אגף {w} ({count})
              </button>
            );
          })}
          {floors.map((f) => {
            const count = plannedTasks.filter((pt) => pt.task.zone.floor === f).length;
            if (count === 0) return null;
            return (
              <button
                key={f}
                onClick={() => setZoneFilter(`floor-${f}`)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  zoneFilter === `floor-${f}`
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                קומה {f} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Add task */}
      <div className="task-card">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Plus size={16} />
          הוסף משימה לתכנון
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <label className="block lg:col-span-2">
            <span className="text-xs text-muted-foreground mb-1 block">בחר שטח / משימה</span>
            <select
              value={addTaskId}
              onChange={(e) => setAddTaskId(e.target.value)}
              className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">בחר משימה...</option>
              {availableToAdd.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.zone.name} ({t.estimatedMinutes} דק׳)
                </option>
              ))}
              {/* Also show tasks from other shifts for cross-adding */}
              {mockTasks
                .filter((t) => t.shift !== shift && !plannedTasks.some((pt) => pt.task.id === t.id))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.zone.name} ({t.estimatedMinutes} דק׳) [משמרת אחרת]
                  </option>
                ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground mb-1 block">סוג הוספה</span>
            <select
              value={addMode}
              onChange={(e) => setAddMode(e.target.value as TaskMode)}
              className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="template">קבוע (תבנית)</option>
              <option value="oneTime">חד פעמי (היום בלבד)</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              onClick={addTask}
              disabled={!addTaskId}
              className="btn-action-primary flex items-center justify-center gap-2 w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} /> הוסף
            </button>
          </div>
        </div>
      </div>

      {/* Task list with assignment */}
      <div className="task-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2">
            <ClipboardList size={16} />
            משימות מתוכננות ({filteredTasks.length})
          </h3>
          {unassignedCount > 0 && (
            <span className="text-xs text-destructive font-medium">
              {unassignedCount} ללא שיבוץ
            </span>
          )}
        </div>

        <div className="space-y-2">
          {filteredTasks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              אין משימות באזור הנבחר
            </p>
          )}
          {filteredTasks.map((pt) => {
            const isUnassigned = !pt.assignedStaffId;
            const assignedStaff = staffOnly.find((s) => s.id === pt.assignedStaffId);

            return (
              <div
                key={pt.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isUnassigned
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border bg-card"
                }`}
              >
                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-sm truncate">{pt.task.name}</p>
                    {pt.mode === "template" ? (
                      <span className="shrink-0 flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-info/15 text-info">
                        <Star size={8} /> קבוע
                      </span>
                    ) : (
                      <span className="shrink-0 flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent-foreground">
                        <CalendarDays size={8} /> חד פעמי
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <MapPin size={10} />
                    <span>{pt.task.zone.name}</span>
                    <span>·</span>
                    <span>אגף {pt.task.zone.wing}</span>
                    <span>·</span>
                    <span>קומה {pt.task.zone.floor}</span>
                    <span>·</span>
                    <span className="mono">{pt.task.estimatedMinutes} דק׳</span>
                  </div>
                </div>

                {/* Staff assignment dropdown */}
                <select
                  value={pt.assignedStaffId || ""}
                  onChange={(e) => assignStaff(pt.id, e.target.value)}
                  className={`w-36 text-xs bg-background border rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-ring ${
                    isUnassigned ? "border-destructive/50" : "border-input"
                  }`}
                >
                  <option value="">לא משובץ</option>
                  {staffOnly.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                {/* Remove */}
                <button
                  onClick={() => removeTask(pt.id)}
                  className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Staff summary */}
      {plannedTasks.some((pt) => pt.assignedStaffId) && (
        <div className="task-card">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <UserPlus size={16} />
            סיכום שיבוצים לפי עובד
          </h3>
          <div className="space-y-3">
            {staffOnly
              .filter((s) => plannedTasks.some((pt) => pt.assignedStaffId === s.id))
              .map((s) => {
                const staffTasks = plannedTasks.filter((pt) => pt.assignedStaffId === s.id);
                const totalMin = staffTasks.reduce((sum, pt) => sum + pt.task.estimatedMinutes, 0);
                return (
                  <div key={s.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                        {s.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground mono">
                          {staffTasks.length} משימות · {totalMin} דק׳
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {staffTasks.map((pt) => (
                        <span
                          key={pt.id}
                          className="px-2 py-1 rounded text-[10px] font-medium bg-success/15 text-success"
                        >
                          {pt.task.zone.name.split(" ").slice(0, 2).join(" ")}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Send */}
      {plannedTasks.length > 0 && (
        sent ? (
          <div className="flex items-center justify-center gap-2 py-4 text-success font-semibold">
            <CheckCircle2 size={20} /> תכנון נשמר ונשלח!
          </div>
        ) : (
          <button
            onClick={handleSend}
            disabled={unassignedCount > 0}
            className="btn-action-success w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
            {unassignedCount > 0
              ? `יש ${unassignedCount} משימות לא משובצות`
              : `שמור ושלח (${plannedTasks.length} משימות)`}
          </button>
        )
      )}
    </div>
  );
};

export default ZonePlanningTab;
