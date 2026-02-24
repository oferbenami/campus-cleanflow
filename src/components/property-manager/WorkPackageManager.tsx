import { useState } from "react";
import {
  Package,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  X,
  Calculator,
  CheckSquare,
  Square,
  Loader2,
  Sliders,
} from "lucide-react";
import {
  useWorkPackages,
  useCloneWorkPackage,
  useDeleteWorkPackage,
  useUpdateTaskStandardTime,
  useBulkUpdateTasks,
  computeStandardMinutes,
  type WorkPackageWithTasks,
  type WorkPackageTask,
} from "@/hooks/useWorkPackages";

const WorkPackageManager = () => {
  const { data: packages = [], isLoading } = useWorkPackages();
  const clonePackage = useCloneWorkPackage();
  const deletePackage = useDeleteWorkPackage();
  const updateTaskTime = useUpdateTaskStandardTime();
  const bulkUpdate = useBulkUpdateTasks();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cloneTarget, setCloneTarget] = useState<string | null>(null);
  const [cloneCode, setCloneCode] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editMinutes, setEditMinutes] = useState(0);
  const [bulkMode, setBulkMode] = useState<string | null>(null); // package id in bulk mode
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<"set" | "multiply" | "recalculate">("set");
  const [bulkField, setBulkField] = useState("standard_minutes");
  const [bulkValue, setBulkValue] = useState(1);

  const toggleTask = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const selectByFilter = (tasks: WorkPackageTask[], filter: "all" | "space_type" | "cleaning_type", value?: string) => {
    if (filter === "all") {
      setSelectedTaskIds(tasks.map((t) => t.id));
    } else {
      const key = filter;
      setSelectedTaskIds(tasks.filter((t) => t[key] === value).map((t) => t.id));
    }
  };

  const handleClone = async (pkgId: string) => {
    if (!cloneCode.trim()) return;
    await clonePackage.mutateAsync({ sourceId: pkgId, newPackageCode: cloneCode.trim() });
    setCloneTarget(null);
    setCloneCode("");
  };

  const handleBulkApply = async () => {
    if (selectedTaskIds.length === 0) return;
    await bulkUpdate.mutateAsync({
      taskIds: selectedTaskIds,
      action: bulkAction,
      field: bulkField,
      value: bulkValue,
      applyRounds: true,
    });
    setSelectedTaskIds([]);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded-xl" />)}
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package size={32} className="mx-auto mb-3 opacity-50" />
        <p className="text-sm">אין חבילות עבודה. ייבא קובץ Excel כדי להתחיל.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Package size={18} className="text-primary" />
        <h3 className="font-bold text-sm">חבילות עבודה ({packages.length})</h3>
      </div>

      {packages.map((pkg) => {
        const isExpanded = expandedId === pkg.id;
        const totalMinutes = pkg.tasks.reduce((s, t) => s + (t.standard_minutes || 0), 0);
        const isBulk = bulkMode === pkg.id;
        const uniqueSpaceTypes = [...new Set(pkg.tasks.map((t) => t.space_type).filter(Boolean))];
        const uniqueCleaningTypes = [...new Set(pkg.tasks.map((t) => t.cleaning_type).filter(Boolean))];

        return (
          <div key={pkg.id} className="task-card">
            {/* Header */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : pkg.id)}>
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Package size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{pkg.name || pkg.package_code}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{pkg.shift_type === "evening" ? "🌙 ערב" : "☀️ בוקר"}</span>
                  <span>·</span>
                  <span>{pkg.tasks.length} משימות</span>
                  <span>·</span>
                  <span>{Math.round(totalMinutes)} דק׳</span>
                  {pkg.building && <><span>·</span><span>{pkg.building}{pkg.floor ? `/${pkg.floor}` : ""}</span></>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setCloneTarget(cloneTarget === pkg.id ? null : pkg.id); }}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title="שכפל"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm("למחוק חבילה זו?")) deletePackage.mutate(pkg.id); }}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="מחק"
                >
                  <Trash2 size={14} />
                </button>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {/* Clone dialog */}
            {cloneTarget === pkg.id && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border space-y-2">
                <p className="text-xs font-semibold">שכפול חבילה</p>
                <input
                  value={cloneCode}
                  onChange={(e) => setCloneCode(e.target.value)}
                  placeholder="קוד חבילה חדש"
                  className="w-full bg-background border border-input rounded px-3 py-2 text-xs"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleClone(pkg.id)}
                    disabled={!cloneCode.trim() || clonePackage.isPending}
                    className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                  >
                    {clonePackage.isPending ? <Loader2 size={12} className="animate-spin mx-auto" /> : "שכפל"}
                  </button>
                  <button onClick={() => { setCloneTarget(null); setCloneCode(""); }} className="px-4 py-2 rounded-lg bg-muted text-xs">
                    ביטול
                  </button>
                </div>
              </div>
            )}

            {/* Expanded tasks */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-border space-y-2">
                {/* Bulk mode toggle */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (isBulk) { setBulkMode(null); setSelectedTaskIds([]); }
                      else setBulkMode(pkg.id);
                    }}
                    className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      isBulk ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sliders size={12} /> {isBulk ? "סגור עריכה מרוכזת" : "עריכה מרוכזת"}
                  </button>
                  {isBulk && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => selectByFilter(pkg.tasks, "all")} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">
                        בחר הכל
                      </button>
                      {uniqueSpaceTypes.map((st) => (
                        <button key={st} onClick={() => selectByFilter(pkg.tasks, "space_type", st!)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/80">
                          {st}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bulk action panel */}
                {isBulk && selectedTaskIds.length > 0 && (
                  <div className="bg-warning/5 border border-warning/30 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold">{selectedTaskIds.length} משימות נבחרו</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(["set", "multiply", "recalculate"] as const).map((action) => (
                        <button
                          key={action}
                          onClick={() => setBulkAction(action)}
                          className={`py-1.5 rounded text-xs font-semibold transition-colors ${
                            bulkAction === action ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {action === "set" ? "קבע ערך" : action === "multiply" ? "הכפל" : "חשב מחדש"}
                        </button>
                      ))}
                    </div>
                    {bulkAction !== "recalculate" && (
                      <div className="grid grid-cols-2 gap-2">
                        {bulkAction === "set" && (
                          <select
                            value={bulkField}
                            onChange={(e) => setBulkField(e.target.value)}
                            className="bg-background border border-input rounded px-2 py-1 text-xs"
                          >
                            <option value="standard_minutes">דקות תקן</option>
                            <option value="area_minutes_coeff">מקדם שטח</option>
                            <option value="tools_minutes_coeff">מקדם כלים</option>
                            <option value="rounds_per_shift">סבבים</option>
                          </select>
                        )}
                        <input
                          type="number"
                          step="0.01"
                          value={bulkValue}
                          onChange={(e) => setBulkValue(parseFloat(e.target.value) || 0)}
                          className="bg-background border border-input rounded px-2 py-1 text-xs"
                          placeholder={bulkAction === "multiply" ? "מכפיל (1.10 = +10%)" : "ערך"}
                        />
                      </div>
                    )}
                    {/* Impact preview */}
                    {bulkAction === "multiply" && (
                      <div className="text-[10px] text-muted-foreground">
                        {(() => {
                          const selectedTasks = pkg.tasks.filter((t) => selectedTaskIds.includes(t.id));
                          const before = selectedTasks.reduce((s, t) => s + t.standard_minutes, 0);
                          const after = Math.round(before * bulkValue * 100) / 100;
                          return `לפני: ${Math.round(before)} דק׳ → אחרי: ${Math.round(after)} דק׳ (${after - before > 0 ? "+" : ""}${Math.round(after - before)} דק׳)`;
                        })()}
                      </div>
                    )}
                    <button
                      onClick={handleBulkApply}
                      disabled={bulkUpdate.isPending}
                      className="w-full py-2 rounded-lg bg-warning text-warning-foreground text-xs font-bold disabled:opacity-50"
                    >
                      {bulkUpdate.isPending ? <Loader2 size={12} className="animate-spin mx-auto" /> : "בצע עדכון מרוכז"}
                    </button>
                  </div>
                )}

                {/* Task rows */}
                {pkg.tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                    {isBulk && (
                      <button onClick={() => toggleTask(task.id)} className="shrink-0">
                        {selectedTaskIds.includes(task.id) ? (
                          <CheckSquare size={14} className="text-primary" />
                        ) : (
                          <Square size={14} className="text-muted-foreground" />
                        )}
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">
                        {task.space_type || "—"} {task.description ? `/ ${task.description}` : ""}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                        {task.cleaning_type && <span>{task.cleaning_type}</span>}
                        {task.area_sqm && <span>{task.area_sqm} מ״ר</span>}
                        {task.rounds_per_shift && task.rounds_per_shift > 1 && <span>{task.rounds_per_shift} סבבים</span>}
                      </div>
                    </div>

                    {/* Standard time display/edit */}
                    {editingTaskId === task.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editMinutes}
                          onChange={(e) => setEditMinutes(parseFloat(e.target.value) || 0)}
                          className="w-16 bg-background border border-input rounded px-2 py-1 text-xs"
                          autoFocus
                        />
                        <button
                          onClick={async () => {
                            await updateTaskTime.mutateAsync({ taskId: task.id, standardMinutes: editMinutes });
                            setEditingTaskId(null);
                          }}
                          className="p-1 text-primary hover:bg-primary/10 rounded"
                        >
                          <Save size={12} />
                        </button>
                        <button onClick={() => setEditingTaskId(null)} className="p-1 text-muted-foreground hover:bg-muted rounded">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-primary">{Math.round(task.standard_minutes)} דק׳</span>
                        <button
                          onClick={() => { setEditingTaskId(task.id); setEditMinutes(task.standard_minutes); }}
                          className="p-1 text-muted-foreground hover:text-foreground rounded"
                          title="ערוך דקות תקן"
                        >
                          <Edit3 size={10} />
                        </button>
                        <button
                          onClick={async () => {
                            const computed = computeStandardMinutes(task);
                            if (computed > 0) {
                              await updateTaskTime.mutateAsync({ taskId: task.id, standardMinutes: computed });
                            }
                          }}
                          className="p-1 text-muted-foreground hover:text-foreground rounded"
                          title="חשב מחדש מהמקדמים"
                        >
                          <Calculator size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Package total */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">סה״כ חבילה:</span>
                  <span className="text-sm font-bold">{Math.round(totalMinutes)} דקות</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WorkPackageManager;
