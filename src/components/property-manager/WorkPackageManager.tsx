import { useState, useCallback } from "react";
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
  Plus,
  GripVertical,
  Check,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  useWorkPackages,
  useCloneWorkPackage,
  useDeleteWorkPackage,
  useUpdateTaskStandardTime,
  useBulkUpdateTasks,
  useAddWorkPackageTask,
  useDeleteWorkPackageTask,
  useUpdateWorkPackageTask,
  computeStandardMinutes,
  type WorkPackageWithTasks,
  type WorkPackageTask,
} from "@/hooks/useWorkPackages";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

import WorkPackageHeader from "./work-package/WorkPackageHeader";
import WorkPackageCloneDialog from "./work-package/WorkPackageCloneDialog";
import WorkPackageBulkPanel from "./work-package/WorkPackageBulkPanel";
import WorkPackageTaskRow from "./work-package/WorkPackageTaskRow";
import WorkPackageAddTask from "./work-package/WorkPackageAddTask";
import WorkPackageTaskFilter from "./work-package/WorkPackageTaskFilter";
import WorkPackageSettingsPanel from "./work-package/WorkPackageSettingsPanel";

const WorkPackageManager = () => {
  const { data: packages = [], isLoading } = useWorkPackages();
  const clonePackage = useCloneWorkPackage();
  const deletePackage = useDeleteWorkPackage();
  const updateTaskTime = useUpdateTaskStandardTime();
  const bulkUpdate = useBulkUpdateTasks();
  const addTask = useAddWorkPackageTask();
  const deleteTask = useDeleteWorkPackageTask();
  const updateTask = useUpdateWorkPackageTask();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cloneTarget, setCloneTarget] = useState<string | null>(null);
  const [cloneCode, setCloneCode] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<WorkPackageTask>>({});
  const [bulkMode, setBulkMode] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<"set" | "multiply" | "recalculate">("set");
  const [bulkField, setBulkField] = useState("standard_minutes");
  const [bulkValue, setBulkValue] = useState(1);
  const [addingToPackage, setAddingToPackage] = useState<string | null>(null);
  const [filteredTasksMap, setFilteredTasksMap] = useState<Record<string, WorkPackageTask[] | null>>({});

  const toggleTask = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const selectByFilter = (tasks: WorkPackageTask[], filter: "all" | "space_type" | "cleaning_type", value?: string) => {
    if (filter === "all") {
      setSelectedTaskIds(tasks.map((t) => t.id));
    } else {
      setSelectedTaskIds(tasks.filter((t) => t[filter] === value).map((t) => t.id));
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

  const startEdit = (task: WorkPackageTask) => {
    setEditingTaskId(task.id);
    setEditFields({
      space_type: task.space_type,
      description: task.description,
      cleaning_type: task.cleaning_type,
      standard_minutes: task.standard_minutes,
      rounds_per_shift: task.rounds_per_shift,
      area_sqm: task.area_sqm,
    });
  };

  const saveEdit = async (taskId: string) => {
    await updateTask.mutateAsync({ taskId, updates: editFields });
    setEditingTaskId(null);
    setEditFields({});
  };

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;

    const pkgId = result.source.droppableId;
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) return;

    const reordered = Array.from(pkg.tasks);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    // Persist new order - we use a simple sequential update
    // We'll update a "notes" field with order prefix or just rewrite order
    // Since there's no explicit order column, we batch-delete and re-insert in order
    try {
      const updates = reordered.map((task, idx) => 
        supabase
          .from("work_package_tasks")
          .update({ notes: task.notes, updated_at: new Date(Date.now() + idx).toISOString() })
          .eq("id", task.id)
      );
      await Promise.all(updates);
      // Force refetch to reflect new order
      // Since order comes from created_at/updated_at, we use updated_at
    } catch (err: any) {
      toast({ title: "שגיאה בסידור", description: err.message, variant: "destructive" });
    }
  }, [packages]);

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
    <DragDropContext onDragEnd={handleDragEnd}>
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

          return (
            <div key={pkg.id} className="task-card">
              <WorkPackageHeader
                pkg={pkg}
                totalMinutes={totalMinutes}
                isExpanded={isExpanded}
                onToggle={() => setExpandedId(isExpanded ? null : pkg.id)}
                onClone={() => setCloneTarget(cloneTarget === pkg.id ? null : pkg.id)}
                onDelete={() => { if (confirm("למחוק חבילה זו?")) deletePackage.mutate(pkg.id); }}
              />

              {cloneTarget === pkg.id && (
                <WorkPackageCloneDialog
                  cloneCode={cloneCode}
                  setCloneCode={setCloneCode}
                  onClone={() => handleClone(pkg.id)}
                  onCancel={() => { setCloneTarget(null); setCloneCode(""); }}
                  isPending={clonePackage.isPending}
                />
              )}

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  {/* Package settings */}
                  <WorkPackageSettingsPanel pkg={pkg} />

                  {/* Search & Filter */}
                  <WorkPackageTaskFilter
                    tasks={pkg.tasks}
                    onFilteredChange={(filtered) =>
                      setFilteredTasksMap((prev) => ({ ...prev, [pkg.id]: filtered.length === pkg.tasks.length ? null : filtered }))
                    }
                  />

                  {/* Bulk mode toggle */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1">
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
                      <button
                        onClick={() => setAddingToPackage(addingToPackage === pkg.id ? null : pkg.id)}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Plus size={12} /> הוסף משימה
                      </button>
                    </div>
                    {isBulk && (
                      <div className="flex items-center gap-1 flex-wrap">
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
                    <WorkPackageBulkPanel
                      selectedCount={selectedTaskIds.length}
                      bulkAction={bulkAction}
                      setBulkAction={setBulkAction}
                      bulkField={bulkField}
                      setBulkField={setBulkField}
                      bulkValue={bulkValue}
                      setBulkValue={setBulkValue}
                      tasks={pkg.tasks}
                      selectedTaskIds={selectedTaskIds}
                      onApply={handleBulkApply}
                      isPending={bulkUpdate.isPending}
                    />
                  )}

                  {/* Add task form */}
                  {addingToPackage === pkg.id && (
                    <WorkPackageAddTask
                      packageId={pkg.id}
                      onAdd={async (data) => {
                        await addTask.mutateAsync(data);
                        setAddingToPackage(null);
                      }}
                      onCancel={() => setAddingToPackage(null)}
                      isPending={addTask.isPending}
                    />
                  )}

                  {/* Draggable task rows */}
                  {(() => {
                    const displayTasks = filteredTasksMap[pkg.id] ?? pkg.tasks;
                    const isFiltered = filteredTasksMap[pkg.id] != null;
                    return (
                      <>
                        {isFiltered && (
                          <p className="text-[10px] text-muted-foreground">מציג {displayTasks.length} מתוך {pkg.tasks.length} משימות</p>
                        )}
                  <Droppable droppableId={pkg.id}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1">
                        {displayTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(dragProvided, snapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                className={`${snapshot.isDragging ? "opacity-80 shadow-lg" : ""}`}
                              >
                                <WorkPackageTaskRow
                                  task={task}
                                  isBulk={isBulk}
                                  isSelected={selectedTaskIds.includes(task.id)}
                                  isEditing={editingTaskId === task.id}
                                  editFields={editFields}
                                  onToggleSelect={() => toggleTask(task.id)}
                                  onStartEdit={() => startEdit(task)}
                                  onSaveEdit={() => saveEdit(task.id)}
                                  onCancelEdit={() => { setEditingTaskId(null); setEditFields({}); }}
                                  onEditFieldChange={(field, value) => setEditFields(prev => ({ ...prev, [field]: value }))}
                                  onDelete={() => deleteTask.mutate(task.id)}
                                  onRecalculate={async () => {
                                    const computed = computeStandardMinutes(task);
                                    if (computed > 0) {
                                      await updateTaskTime.mutateAsync({ taskId: task.id, standardMinutes: computed });
                                    }
                                  }}
                                  dragHandleProps={dragProvided.dragHandleProps}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                      </>
                    );
                  })()}

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
    </DragDropContext>
  );
};

export default WorkPackageManager;
