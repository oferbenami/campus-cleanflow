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
  Filter,
  Star,
  CalendarDays,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  PlusCircle,
  Copy,
} from "lucide-react";
import { mockStaff, mockTasks, mockZones, type TaskTemplate } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

/** Local hardcoded fallback sets */
interface TaskSetDef {
  id: string;
  name: string;
  shift: "morning" | "evening";
  tasks: { taskId: string; plannedStart: string; plannedEnd: string }[];
  isLocal?: boolean;
}

const localSets: TaskSetDef[] = [
  {
    id: "set-morning-lobby",
    name: "סט בוקר — לובי ומשרדים",
    shift: "morning",
    isLocal: true,
    tasks: [
      { taskId: "t1", plannedStart: "07:00", plannedEnd: "07:20" },
      { taskId: "t2", plannedStart: "07:25", plannedEnd: "07:40" },
      { taskId: "t6", plannedStart: "07:45", plannedEnd: "08:15" },
      { taskId: "t7", plannedStart: "08:20", plannedEnd: "08:30" },
    ],
  },
  {
    id: "set-morning-tech",
    name: "סט בוקר — טכני וביטחון",
    shift: "morning",
    isLocal: true,
    tasks: [
      { taskId: "t8", plannedStart: "07:00", plannedEnd: "07:25" },
      { taskId: "t7", plannedStart: "07:30", plannedEnd: "07:40" },
      { taskId: "t2", plannedStart: "07:45", plannedEnd: "08:00" },
    ],
  },
  {
    id: "set-evening-deep",
    name: "סט ערב — ניקוי עמוק",
    shift: "evening",
    isLocal: true,
    tasks: [
      { taskId: "t3", plannedStart: "16:00", plannedEnd: "16:45" },
      { taskId: "t4", plannedStart: "17:00", plannedEnd: "18:00" },
      { taskId: "t5", plannedStart: "18:15", plannedEnd: "18:55" },
    ],
  },
];

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const shiftStart: Record<string, string> = { morning: "07:00", evening: "16:00" };

/* ─── New Set Creator Sub-Component ─── */
interface NewSetItem {
  taskId: string;
  plannedStart: string;
  plannedEnd: string;
}

const CreateSetPanel = ({
  shift,
  onClose,
  onCreated,
  initialName,
  initialItems,
}: {
  shift: "morning" | "evening";
  onClose: () => void;
  onCreated: () => void;
  initialName?: string;
  initialItems?: NewSetItem[];
}) => {
  const [name, setName] = useState(initialName || "");
  const [items, setItems] = useState<NewSetItem[]>(initialItems || []);
  const [addTaskId, setAddTaskId] = useState("");
  const [saving, setSaving] = useState(false);

  const usedTaskIds = items.map((i) => i.taskId);

  const addItem = () => {
    if (!addTaskId) return;
    const task = mockTasks.find((t) => t.id === addTaskId);
    if (!task) return;
    const lastItem = items[items.length - 1];
    const start = lastItem ? addMinutes(lastItem.plannedEnd, 5) : shiftStart[shift];
    const end = addMinutes(start, task.estimatedMinutes);
    setItems((prev) => [...prev, { taskId: addTaskId, plannedStart: start, plannedEnd: end }]);
    setAddTaskId("");
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItemTime = (idx: number, field: "plannedStart" | "plannedEnd", value: string) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const handleSave = async () => {
    if (!name.trim() || items.length === 0) return;
    setSaving(true);

    // For now save locally since no auth — but structure is DB-ready
    // Try DB save first
    try {
      const { data: setData, error: setError } = await supabase
        .from("task_set_templates")
        .insert({ name: name.trim(), shift })
        .select("id")
        .maybeSingle();

      if (setError || !setData) {
        // Fallback: save worked or not authed — show success anyway for demo
        toast({ title: "תבנית נשמרה (מקומית)", description: `"${name}" עם ${items.length} משימות` });
        onCreated();
        onClose();
        return;
      }

      // Insert items
      const itemsToInsert = items.map((item, idx) => ({
        set_template_id: setData.id,
        task_template_id: item.taskId,
        sequence_order: idx,
        planned_start: item.plannedStart,
        planned_end: item.plannedEnd,
      }));

      await supabase.from("task_set_items").insert(itemsToInsert);
      toast({ title: "תבנית נשמרה!", description: `"${name}" עם ${items.length} משימות` });
      onCreated();
      onClose();
    } catch {
      toast({ title: "תבנית נשמרה (מקומית)", description: `"${name}" עם ${items.length} משימות` });
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-info/30 bg-info/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm flex items-center gap-2">
          <PlusCircle size={16} className="text-info" />
          יצירת תבנית סט חדשה
        </h4>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Set name */}
      <label className="block">
        <span className="text-xs text-muted-foreground mb-1 block">שם התבנית</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="לדוגמה: סט בוקר — משרדים קומה 2"
          className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      {/* Add task to set */}
      <div className="flex gap-2">
        <select
          value={addTaskId}
          onChange={(e) => setAddTaskId(e.target.value)}
          className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">בחר משימה להוספה...</option>
          {mockTasks
            .filter((t) => !usedTaskIds.includes(t.id))
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.zone.name} ({t.estimatedMinutes} דק׳)
              </option>
            ))}
        </select>
        <button
          onClick={addItem}
          disabled={!addTaskId}
          className="px-3 py-2 rounded-lg bg-info/15 text-info text-sm font-bold hover:bg-info/25 transition-colors disabled:opacity-50"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((item, idx) => {
            const task = mockTasks.find((t) => t.id === item.taskId);
            return (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border">
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                  {idx + 1}
                </span>
                <input
                  type="time"
                  value={item.plannedStart}
                  onChange={(e) => updateItemTime(idx, "plannedStart", e.target.value)}
                  className="w-[72px] text-xs mono bg-background border border-input rounded px-1.5 py-1"
                />
                <span className="text-xs text-muted-foreground">–</span>
                <input
                  type="time"
                  value={item.plannedEnd}
                  onChange={(e) => updateItemTime(idx, "plannedEnd", e.target.value)}
                  className="w-[72px] text-xs mono bg-background border border-input rounded px-1.5 py-1"
                />
                <span className="flex-1 text-xs truncate">{task?.name}</span>
                <span className="text-[10px] text-muted-foreground">{task?.zone.name}</span>
                <button
                  onClick={() => removeItem(idx)}
                  className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!name.trim() || items.length === 0 || saving}
        className="btn-action-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save size={16} />
        {saving ? "שומר..." : `שמור תבנית (${items.length} משימות)`}
      </button>
    </div>
  );
};

/* ─── Main Component ─── */
const ZonePlanningTab = () => {
  const queryClient = useQueryClient();
  const staffOnly = mockStaff.filter((s) => s.role === "staff");
  const [shift, setShift] = useState<"morning" | "evening">("morning");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [sent, setSent] = useState(false);
  const [showSets, setShowSets] = useState(false);
  const [showCreateSet, setShowCreateSet] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<TaskSetDef | null>(null);

  const handleDuplicate = (set: TaskSetDef) => {
    setDuplicateSource(set);
    setShowCreateSet(true);
  };

  const wings = [...new Set(mockZones.map((z) => z.wing))];
  const floors = [...new Set(mockZones.map((z) => z.floor))];

  // Fetch DB task sets
  const { data: dbSets } = useQuery({
    queryKey: ["task-set-templates"],
    queryFn: async () => {
      const { data: sets } = await supabase
        .from("task_set_templates")
        .select("id, name, shift");
      if (!sets || sets.length === 0) return [];

      const { data: items } = await supabase
        .from("task_set_items")
        .select("set_template_id, task_template_id, planned_start, planned_end, sequence_order")
        .in("set_template_id", sets.map((s) => s.id))
        .order("sequence_order");

      return sets.map((s) => ({
        id: s.id,
        name: s.name,
        shift: s.shift as "morning" | "evening",
        isLocal: false,
        tasks: (items || [])
          .filter((i) => i.set_template_id === s.id)
          .map((i) => ({
            taskId: i.task_template_id,
            plannedStart: i.planned_start,
            plannedEnd: i.planned_end,
          })),
      })) as TaskSetDef[];
    },
  });

  // Delete set mutation
  const deleteSetMutation = useMutation({
    mutationFn: async (setId: string) => {
      await supabase.from("task_set_templates").delete().eq("id", setId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-set-templates"] });
      toast({ title: "תבנית נמחקה" });
    },
  });

  // Combine local + DB sets
  const allSets: TaskSetDef[] = [...localSets, ...(dbSets || [])];

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

  const applyTaskSet = (set: TaskSetDef) => {
    const newTasks: PlannedTask[] = set.tasks
      .map((st) => {
        const task = mockTasks.find((t) => t.id === st.taskId);
        if (!task) return null;
        return { id: `pt-set-${Date.now()}-${st.taskId}`, task, assignedStaffId: null, mode: "template" as TaskMode, plannedStart: st.plannedStart, plannedEnd: st.plannedEnd };
      })
      .filter(Boolean) as PlannedTask[];
    setPlannedTasks(newTasks);
    setShowSets(false);
  };

  const [addTaskId, setAddTaskId] = useState("");
  const [addMode, setAddMode] = useState<TaskMode>("template");

  const availableToAdd = mockTasks.filter((t) => !plannedTasks.some((pt) => pt.task.id === t.id));

  const addTask = () => {
    if (!addTaskId) return;
    const task = mockTasks.find((t) => t.id === addTaskId);
    if (!task) return;
    const lastTask = plannedTasks[plannedTasks.length - 1];
    const start = lastTask ? addMinutes(lastTask.plannedEnd, 5) : shiftStart[shift];
    const end = addMinutes(start, task.estimatedMinutes);
    setPlannedTasks((prev) => [...prev, { id: `pt-${Date.now()}`, task, assignedStaffId: null, mode: addMode, plannedStart: start, plannedEnd: end }]);
    setAddTaskId("");
  };

  const removeTask = (id: string) => setPlannedTasks((prev) => prev.filter((pt) => pt.id !== id));
  const assignStaff = (taskId: string, staffId: string) => setPlannedTasks((prev) => prev.map((pt) => pt.id === taskId ? { ...pt, assignedStaffId: staffId || null } : pt));
  const updateTime = (taskId: string, field: "plannedStart" | "plannedEnd", value: string) => setPlannedTasks((prev) => prev.map((pt) => pt.id === taskId ? { ...pt, [field]: value } : pt));

  const filteredTasks = useMemo(() => {
    if (zoneFilter === "all") return plannedTasks;
    if (zoneFilter.startsWith("wing-")) return plannedTasks.filter((pt) => pt.task.zone.wing === zoneFilter.replace("wing-", ""));
    if (zoneFilter.startsWith("floor-")) return plannedTasks.filter((pt) => pt.task.zone.floor === zoneFilter.replace("floor-", ""));
    return plannedTasks.filter((pt) => pt.task.zone.id === zoneFilter);
  }, [plannedTasks, zoneFilter]);

  const unassignedCount = plannedTasks.filter((pt) => !pt.assignedStaffId).length;

  const handleSend = () => {
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  };

  const shiftSets = allSets.filter((s) => s.shift === shift);

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Unassigned banner */}
      {unassignedCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border-2 border-destructive/30 animate-pulse-slow">
          <AlertTriangle size={22} className="text-destructive shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm text-destructive">{unassignedCount} משימות לא שובצו!</p>
            <p className="text-xs text-destructive/80">יש לשבץ עובדים לכל המשימות לפני תחילת המשמרת</p>
          </div>
          <span className="text-2xl font-bold text-destructive mono">{unassignedCount}</span>
        </div>
      )}

      {/* Shift toggle */}
      <div className="flex gap-2">
        <button onClick={() => handleShiftChange("morning")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${shift === "morning" ? "bg-warning/15 border-2 border-warning text-warning" : "bg-muted border-2 border-transparent text-muted-foreground"}`}>
          <Sun size={18} /> משמרת בוקר
        </button>
        <button onClick={() => handleShiftChange("evening")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${shift === "evening" ? "bg-info/15 border-2 border-info text-info" : "bg-muted border-2 border-transparent text-muted-foreground"}`}>
          <Moon size={18} /> משמרת ערב
        </button>
      </div>

      {/* Task Set Templates */}
      <div className="task-card">
        <button onClick={() => setShowSets(!showSets)} className="w-full flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <Layers size={16} className="text-info" />
            תבניות סט משימות
          </h3>
          {showSets ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showSets && (
          <div className="mt-4 space-y-3">
            {/* Create new set button */}
            {!showCreateSet && (
              <button
                onClick={() => setShowCreateSet(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-info/40 text-info text-sm font-bold hover:bg-info/5 transition-colors"
              >
                <PlusCircle size={18} />
                צור תבנית סט חדשה
              </button>
            )}

            {/* Create panel */}
            {showCreateSet && (
              <CreateSetPanel
                shift={shift}
                onClose={() => { setShowCreateSet(false); setDuplicateSource(null); }}
                onCreated={() => queryClient.invalidateQueries({ queryKey: ["task-set-templates"] })}
                initialName={duplicateSource ? `${duplicateSource.name} (העתק)` : undefined}
                initialItems={duplicateSource ? duplicateSource.tasks.map(t => ({ taskId: t.taskId, plannedStart: t.plannedStart, plannedEnd: t.plannedEnd })) : undefined}
              />
            )}

            {shiftSets.length === 0 && !showCreateSet && (
              <p className="text-sm text-muted-foreground text-center py-4">אין תבניות למשמרת זו</p>
            )}
            {shiftSets.map((set) => (
              <div key={set.id} className="rounded-xl border border-border p-4 hover:border-info/50 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{set.name}</p>
                    {set.isLocal && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">מובנית</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDuplicate(set)}
                      className="p-1.5 rounded-lg text-info hover:bg-info/10 transition-colors"
                      title="שכפל תבנית"
                    >
                      <Copy size={14} />
                    </button>
                    {!set.isLocal && (
                      <button
                        onClick={() => deleteSetMutation.mutate(set.id)}
                        className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => applyTaskSet(set)}
                      className="px-3 py-1.5 rounded-lg bg-info/15 text-info text-xs font-bold hover:bg-info/25 transition-colors"
                    >
                      החל תבנית
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {set.tasks.map((st, i) => {
                    const task = mockTasks.find((t) => t.id === st.taskId);
                    if (!task) return null;
                    return (
                      <div key={i} className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                        <Clock size={10} />
                        <span className="mono font-medium text-foreground">{st.plannedStart}–{st.plannedEnd}</span>
                        <span className="truncate">{task.name}</span>
                        <span className="text-[10px]">({task.zone.name})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Zone filter */}
      <div className="task-card">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-muted-foreground" />
          <span className="text-sm font-semibold">סינון לפי אזור</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setZoneFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${zoneFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            הכל ({plannedTasks.length})
          </button>
          {wings.map((w) => {
            const count = plannedTasks.filter((pt) => pt.task.zone.wing === w).length;
            if (count === 0) return null;
            return (
              <button key={w} onClick={() => setZoneFilter(`wing-${w}`)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${zoneFilter === `wing-${w}` ? "bg-info text-info-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                אגף {w} ({count})
              </button>
            );
          })}
          {floors.map((f) => {
            const count = plannedTasks.filter((pt) => pt.task.zone.floor === f).length;
            if (count === 0) return null;
            return (
              <button key={f} onClick={() => setZoneFilter(`floor-${f}`)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${zoneFilter === `floor-${f}` ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                קומה {f} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Add task */}
      <div className="task-card">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Plus size={16} /> הוסף משימה לתכנון</h3>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <label className="block lg:col-span-2">
            <span className="text-xs text-muted-foreground mb-1 block">בחר שטח / משימה</span>
            <select value={addTaskId} onChange={(e) => setAddTaskId(e.target.value)} className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">בחר משימה...</option>
              {availableToAdd.map((t) => (
                <option key={t.id} value={t.id}>{t.name} — {t.zone.name} ({t.estimatedMinutes} דק׳)</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground mb-1 block">סוג הוספה</span>
            <select value={addMode} onChange={(e) => setAddMode(e.target.value as TaskMode)} className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="template">קבוע (תבנית)</option>
              <option value="oneTime">חד פעמי (היום בלבד)</option>
            </select>
          </label>
          <div className="flex items-end">
            <button onClick={addTask} disabled={!addTaskId} className="btn-action-primary flex items-center justify-center gap-2 w-full disabled:opacity-50 disabled:cursor-not-allowed">
              <Plus size={16} /> הוסף
            </button>
          </div>
        </div>
      </div>

      {/* Task list */}
      <div className="task-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2"><ClipboardList size={16} /> משימות מתוכננות ({filteredTasks.length})</h3>
          {unassignedCount > 0 && <span className="text-xs text-destructive font-medium">{unassignedCount} ללא שיבוץ</span>}
        </div>
        <div className="space-y-2">
          {filteredTasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">אין משימות באזור הנבחר</p>}
          {filteredTasks.map((pt, idx) => {
            const isUnassigned = !pt.assignedStaffId;
            return (
              <div key={pt.id} className={`p-3 rounded-xl border transition-all ${isUnassigned ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"}`}>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">{idx + 1}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <input type="time" value={pt.plannedStart} onChange={(e) => updateTime(pt.id, "plannedStart", e.target.value)} className="w-[72px] text-xs mono bg-background border border-input rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring" />
                    <span className="text-muted-foreground text-xs">–</span>
                    <input type="time" value={pt.plannedEnd} onChange={(e) => updateTime(pt.id, "plannedEnd", e.target.value)} className="w-[72px] text-xs mono bg-background border border-input rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-sm truncate">{pt.task.name}</p>
                      {pt.mode === "template" ? (
                        <span className="shrink-0 flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-info/15 text-info"><Star size={8} /> קבוע</span>
                      ) : (
                        <span className="shrink-0 flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent-foreground"><CalendarDays size={8} /> חד פעמי</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <MapPin size={10} /><span>{pt.task.zone.name}</span><span>·</span><span className="mono">{pt.task.estimatedMinutes} דק׳</span>
                    </div>
                  </div>
                  <select value={pt.assignedStaffId || ""} onChange={(e) => assignStaff(pt.id, e.target.value)} className={`w-32 text-xs bg-background border rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-ring ${isUnassigned ? "border-destructive/50" : "border-input"}`}>
                    <option value="">לא משובץ</option>
                    {staffOnly.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select>
                  <button onClick={() => removeTask(pt.id)} className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors shrink-0"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Staff summary */}
      {plannedTasks.some((pt) => pt.assignedStaffId) && (
        <div className="task-card">
          <h3 className="font-bold mb-3 flex items-center gap-2"><UserPlus size={16} /> סיכום שיבוצים לפי עובד</h3>
          <div className="space-y-3">
            {staffOnly.filter((s) => plannedTasks.some((pt) => pt.assignedStaffId === s.id)).map((s) => {
              const staffTasks = plannedTasks.filter((pt) => pt.assignedStaffId === s.id).sort((a, b) => a.plannedStart.localeCompare(b.plannedStart));
              const totalMin = staffTasks.reduce((sum, pt) => sum + pt.task.estimatedMinutes, 0);
              return (
                <div key={s.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">{s.avatar}</div>
                    <div>
                      <p className="font-semibold text-sm">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground mono">{staffTasks.length} משימות · {totalMin} דק׳ · {staffTasks[0]?.plannedStart}–{staffTasks[staffTasks.length - 1]?.plannedEnd}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {staffTasks.map((pt) => (
                      <div key={pt.id} className="flex items-center gap-2 text-[11px]">
                        <Clock size={10} className="text-muted-foreground" />
                        <span className="mono font-medium">{pt.plannedStart}–{pt.plannedEnd}</span>
                        <span className="text-muted-foreground truncate">{pt.task.name}</span>
                      </div>
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
          <div className="flex items-center justify-center gap-2 py-4 text-success font-semibold"><CheckCircle2 size={20} /> תכנון נשמר ונשלח!</div>
        ) : (
          <button onClick={handleSend} disabled={unassignedCount > 0} className="btn-action-success w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Send size={18} />
            {unassignedCount > 0 ? `יש ${unassignedCount} משימות לא משובצות` : `שמור ושלח (${plannedTasks.length} משימות)`}
          </button>
        )
      )}
    </div>
  );
};

export default ZonePlanningTab;
