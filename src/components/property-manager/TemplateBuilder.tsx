import { useState } from "react";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  X,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  Layers,
  Zap,
} from "lucide-react";
import {
  useTaskTemplates,
  useCreateTemplate,
  useAddTemplateTask,
  useDeleteTemplateTask,
  useDeleteTemplate,
  useCampusLocations,
  type TemplateWithTasks,
} from "@/hooks/usePropertyManagerData";

const DAY_LABELS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

interface TemplateBuilderProps {
  templateType: "base" | "addon";
}

const TemplateBuilder = ({ templateType }: TemplateBuilderProps) => {
  const { data: templates = [], isLoading } = useTaskTemplates(templateType);
  const { data: locations = [] } = useCampusLocations();
  const createTemplate = useCreateTemplate();
  const addTask = useAddTemplateTask();
  const deleteTask = useDeleteTemplateTask();
  const deleteTemplate = useDeleteTemplate();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newShift, setNewShift] = useState<"morning" | "evening">("morning");
  const [newDesc, setNewDesc] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingTaskFor, setAddingTaskFor] = useState<string | null>(null);

  // New task form
  const [taskName, setTaskName] = useState("");
  const [taskLocation, setTaskLocation] = useState("");
  const [taskMinutes, setTaskMinutes] = useState(30);
  const [taskPriority, setTaskPriority] = useState<"normal" | "high">("normal");
  const [taskDays, setTaskDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [taskWindowStart, setTaskWindowStart] = useState("");
  const [taskWindowEnd, setTaskWindowEnd] = useState("");

  const handleCreateTemplate = async () => {
    if (!newName.trim()) return;
    await createTemplate.mutateAsync({
      name: newName.trim(),
      templateType,
      shiftType: newShift,
      description: newDesc.trim() || undefined,
    });
    setNewName("");
    setNewDesc("");
    setShowCreate(false);
  };

  const toggleDay = (day: number) => {
    setTaskDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleAddTask = async (templateId: string) => {
    if (!taskName.trim() || !taskLocation) return;
    await addTask.mutateAsync({
      templateId,
      taskName: taskName.trim(),
      locationId: taskLocation,
      standardMinutes: taskMinutes,
      priority: taskPriority,
      daysOfWeek: taskDays,
      windowStart: taskWindowStart || undefined,
      windowEnd: taskWindowEnd || undefined,
    });
    resetTaskForm();
    setAddingTaskFor(null);
  };

  const resetTaskForm = () => {
    setTaskName("");
    setTaskLocation("");
    setTaskMinutes(30);
    setTaskPriority("normal");
    setTaskDays([0, 1, 2, 3, 4]);
    setTaskWindowStart("");
    setTaskWindowEnd("");
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {templateType === "base" ? (
            <Layers size={18} className="text-primary" />
          ) : (
            <Zap size={18} className="text-warning" />
          )}
          <h3 className="font-bold text-sm">
            {templateType === "base" ? "תבניות בסיס (שגרה)" : "חבילות תוספת (מיוחד)"}
          </h3>
          <span className="text-xs text-muted-foreground">({templates.length})</span>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80"
          >
            <Plus size={14} /> חדש
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="task-card space-y-3 border-2 border-primary/30">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm">
              {templateType === "base" ? "תבנית בסיס חדשה" : "חבילת תוספת חדשה"}
            </h4>
            <button onClick={() => setShowCreate(false)} className="p-1 rounded hover:bg-muted">
              <X size={16} />
            </button>
          </div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="שם התבנית"
            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm"
            autoFocus
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="תיאור (אופציונלי)"
            rows={2}
            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setNewShift("morning")}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                newShift === "morning" ? "bg-warning/15 text-warning border border-warning" : "bg-muted text-muted-foreground"
              }`}
            >
              בוקר
            </button>
            <button
              onClick={() => setNewShift("evening")}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                newShift === "evening" ? "bg-info/15 text-info border border-info" : "bg-muted text-muted-foreground"
              }`}
            >
              ערב
            </button>
          </div>
          <button
            onClick={handleCreateTemplate}
            disabled={!newName.trim() || createTemplate.isPending}
            className="btn-action-primary w-full flex items-center justify-center gap-2 !py-3 !text-sm disabled:opacity-50"
          >
            {createTemplate.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            צור תבנית
          </button>
        </div>
      )}

      {/* Templates list */}
      {templates.length === 0 && !showCreate ? (
        <div className="text-center py-12 text-muted-foreground">
          <Layers size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">
            {templateType === "base" ? "אין תבניות בסיס" : "אין חבילות תוספת"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((tmpl) => {
            const isExpanded = expandedId === tmpl.id;
            const totalMinutes = tmpl.tasks.reduce((s, t) => s + t.standard_minutes, 0);
            return (
              <div key={tmpl.id} className="task-card">
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : tmpl.id)}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    templateType === "base" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"
                  }`}>
                    {templateType === "base" ? <Layers size={18} /> : <Zap size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{tmpl.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{tmpl.shift_type === "morning" ? "☀️ בוקר" : "🌙 ערב"}</span>
                      <span>·</span>
                      <span>{tmpl.tasks.length} משימות</span>
                      <span>·</span>
                      <span>{totalMinutes} דק׳</span>
                    </div>
                    {tmpl.description && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{tmpl.description}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("למחוק תבנית זו?")) deleteTemplate.mutate(tmpl.id);
                    }}
                    className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    {/* Task list */}
                    {tmpl.tasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                        <MapPin size={12} className="text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{task.task_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {task.location_name} · {task.standard_minutes} דק׳ ·{" "}
                            {task.days_of_week.map((d: number) => DAY_LABELS[d]).join(",")}
                            {task.priority === "high" && " · 🔴 גבוה"}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteTask.mutate(task.id)}
                          className="text-destructive/60 hover:text-destructive p-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}

                    {/* Add task form */}
                    {addingTaskFor === tmpl.id ? (
                      <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border">
                        <input
                          value={taskName}
                          onChange={(e) => setTaskName(e.target.value)}
                          placeholder="שם המשימה"
                          className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs"
                          autoFocus
                        />
                        <select
                          value={taskLocation}
                          onChange={(e) => setTaskLocation(e.target.value)}
                          className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs"
                        >
                          <option value="">בחר מיקום...</option>
                          {locations.map((l) => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-muted-foreground">דקות תקן</label>
                            <input
                              type="number"
                              value={taskMinutes}
                              onChange={(e) => setTaskMinutes(Number(e.target.value))}
                              className="w-full bg-background border border-input rounded-lg px-3 py-1.5 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground">עדיפות</label>
                            <select
                              value={taskPriority}
                              onChange={(e) => setTaskPriority(e.target.value as "normal" | "high")}
                              className="w-full bg-background border border-input rounded-lg px-3 py-1.5 text-xs"
                            >
                              <option value="normal">רגיל</option>
                              <option value="high">גבוה</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground mb-1 block">ימי הפעלה</label>
                          <div className="flex gap-1">
                            {DAY_LABELS.map((label, idx) => (
                              <button
                                key={idx}
                                onClick={() => toggleDay(idx)}
                                className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-colors ${
                                  taskDays.includes(idx)
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-muted-foreground">חלון התחלה</label>
                            <input
                              type="time"
                              value={taskWindowStart}
                              onChange={(e) => setTaskWindowStart(e.target.value)}
                              className="w-full bg-background border border-input rounded-lg px-3 py-1.5 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground">חלון סיום</label>
                            <input
                              type="time"
                              value={taskWindowEnd}
                              onChange={(e) => setTaskWindowEnd(e.target.value)}
                              className="w-full bg-background border border-input rounded-lg px-3 py-1.5 text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddTask(tmpl.id)}
                            disabled={!taskName.trim() || !taskLocation || addTask.isPending}
                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                          >
                            {addTask.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            שמור
                          </button>
                          <button
                            onClick={() => { setAddingTaskFor(null); resetTaskForm(); }}
                            className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-xs font-semibold"
                          >
                            ביטול
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingTaskFor(tmpl.id); resetTaskForm(); }}
                        className="w-full flex items-center justify-center gap-1 py-2 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                      >
                        <Plus size={12} /> הוסף משימה
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TemplateBuilder;
