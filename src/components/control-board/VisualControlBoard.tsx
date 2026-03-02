import { useState, useMemo, useEffect, useCallback } from "react";
import { useControlBoardData, type CBWorker, type CBTask, type CBTicket } from "@/hooks/useControlBoardData";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar, Loader2, AlertTriangle, Zap, Clock, MapPin, Timer, Building,
  ChevronLeft, ChevronRight, User, ArrowRightLeft, Pause, Copy,
  XCircle, ChevronDown, GripVertical,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

// ── Constants ──
const SHIFTS = {
  morning: { start: 6, end: 14, label: "בוקר 06:00–14:00" },
  evening: { start: 14, end: 22, label: "ערב 14:00–22:00" },
} as const;
type ShiftKey = keyof typeof SHIFTS;
const LEFT_PANEL_W = "w-[140px]";
const ISSUE_COL_W = "w-[28px]";
const ROW_H = "h-[48px]";

type TileColor = "neutral" | "yellow" | "red" | "green" | "deferred" | "cancelled";

function getTileColor(task: CBTask, now: Date): TileColor {
  if (task.status === "cancelled") return "cancelled";
  if (task.status === "completed") return "green";
  if (task.status === "deferred" || task.status === "paused") return "deferred";
  if (task.status === "in_progress") {
    if (task.started_at) {
      const elapsed = (now.getTime() - new Date(task.started_at).getTime()) / 60000;
      if (elapsed > task.standard_minutes * 1.15) return "red";
    }
    return "yellow";
  }
  return "neutral";
}

const tileStyles: Record<TileColor, string> = {
  neutral: "bg-muted/60 border-border text-muted-foreground",
  yellow: "bg-warning/20 border-warning/50 text-warning-foreground",
  red: "bg-destructive/20 border-destructive/50 text-destructive animate-pulse-slow",
  green: "bg-success/20 border-success/50 text-foreground",
  deferred: "bg-info/15 border-info/40 text-info",
  cancelled: "bg-muted/30 border-border/50 text-muted-foreground/50 line-through",
};

// ── Helpers ──
function parseTimeToMinutes(ts: string | null): number | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}
function minutesToLeftPercent(minutes: number, hourStart: number, totalHours: number): number {
  return ((minutes - hourStart * 60) / (totalHours * 60)) * 100;
}
function minutesToWidthPercent(minutes: number, totalHours: number): number {
  return (minutes / (totalHours * 60)) * 100;
}

// ── Main Component ──
const VisualControlBoard = () => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [activeShift, setActiveShift] = useState<ShiftKey>("morning");
  const [selectedTask, setSelectedTask] = useState<CBTask | null>(null);
  const [now, setNow] = useState(new Date());
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dropTargetWorkerId, setDropTargetWorkerId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [editingInline, setEditingInline] = useState<{ taskName: string; standardMinutes: number } | null>(null);

  const {
    workers, tasks, tickets, loading,
    reassignTask, changePriority, deferTaskManager, cancelTask, duplicateTask, refetch: fetchData,
  } = useControlBoardData(selectedDate);

  const shift = SHIFTS[activeShift];
  const HOUR_START = shift.start;
  const HOUR_END = shift.end;
  const TOTAL_HOURS = HOUR_END - HOUR_START;

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(iv);
  }, []);

  const filteredWorkers = useMemo(() => workers.filter((w) => w.shift_type === activeShift), [workers, activeShift]);

  const tasksByWorker = useMemo(() => {
    const map: Record<string, CBTask[]> = {};
    tasks.forEach((t) => {
      if (!map[t.staff_user_id]) map[t.staff_user_id] = [];
      map[t.staff_user_id].push(t);
    });
    return map;
  }, [tasks]);

  const ticketsByWorker = useMemo(() => {
    const map: Record<string, CBTicket[]> = {};
    tickets.forEach((t) => {
      const key = t.assigned_to_user_id || "__unassigned__";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tickets]);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowLeftPct = minutesToLeftPercent(nowMinutes, HOUR_START, TOTAL_HOURS);
  const showNowLine = selectedDate === new Date().toISOString().split("T")[0] && nowMinutes >= HOUR_START * 60 && nowMinutes <= HOUR_END * 60;

  const changeDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  // ── Drag & Drop handlers ──
  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    setDragTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, workerId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetWorkerId(workerId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTargetWorkerId(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetWorker: CBWorker) => {
    e.preventDefault();
    setDropTargetWorkerId(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.staff_user_id === targetWorker.id) { setDragTaskId(null); return; }

    // Capacity check
    const targetPlanned = targetWorker.total_planned_minutes + task.standard_minutes;
    if (targetPlanned > targetWorker.shift_capacity_minutes) {
      const overBy = targetPlanned - targetWorker.shift_capacity_minutes;
      toast({
        title: "⚠️ חריגת קיבולת",
        description: `${targetWorker.full_name} יחרוג ב-${overBy} דקות מקיבולת המשמרת. הפעולה בוצעה עם אזהרה.`,
        variant: "destructive",
      });
    }

    try {
      await reassignTask(taskId, targetWorker.assignment_id, targetWorker.id);
      toast({ title: "✓ משימה שובצה מחדש", description: `→ ${targetWorker.full_name}` });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    }
    setDragTaskId(null);
  }, [tasks, reassignTask]);

  // ── Quick Actions ──
  const handleReassign = useCallback(async (taskId: string, targetWorkerId: string) => {
    const targetWorker = filteredWorkers.find(w => w.id === targetWorkerId);
    if (!targetWorker) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const targetPlanned = targetWorker.total_planned_minutes + task.standard_minutes;
    if (targetPlanned > targetWorker.shift_capacity_minutes) {
      const overBy = targetPlanned - targetWorker.shift_capacity_minutes;
      toast({
        title: "⚠️ חריגת קיבולת",
        description: `${targetWorker.full_name} יחרוג ב-${overBy} דקות. הפעולה בוצעה עם אזהרה.`,
        variant: "destructive",
      });
    }

    try {
      await reassignTask(taskId, targetWorker.assignment_id, targetWorker.id);
      toast({ title: "✓ משימה שובצה מחדש" });
      setSelectedTask(null);
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    }
  }, [filteredWorkers, tasks, reassignTask]);

  const handlePriority = useCallback(async (taskId: string, p: "normal" | "high") => {
    try {
      await changePriority(taskId, p);
      toast({ title: `✓ עדיפות שונתה ל-${p === "high" ? "גבוה" : "רגיל"}` });
      setSelectedTask(null);
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    }
  }, [changePriority]);

  const handleDefer = useCallback(async (taskId: string) => {
    try {
      await deferTaskManager(taskId);
      toast({ title: "⏸ משימה הושהתה ע״י מנהל" });
      setSelectedTask(null);
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    }
  }, [deferTaskManager]);

  const handleCancel = useCallback(async (taskId: string) => {
    if (!cancelReason.trim()) {
      toast({ title: "נדרשת סיבת ביטול", variant: "destructive" });
      return;
    }
    try {
      await cancelTask(taskId, cancelReason);
      toast({ title: "✕ משימה בוטלה" });
      setSelectedTask(null);
      setShowCancelDialog(false);
      setCancelReason("");
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    }
  }, [cancelTask, cancelReason]);

  const handleDuplicate = useCallback(async (taskId: string) => {
    try {
      await duplicateTask(taskId);
      toast({ title: "✓ משימה שוכפלה" });
      setSelectedTask(null);
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    }
  }, [duplicateTask]);

  const handleInlineEdit = useCallback(async (taskId: string, updates: { task_name?: string; standard_minutes?: number }) => {
    try {
      const { error } = await supabase
        .from("assigned_tasks")
        .update(updates)
        .eq("id", taskId);
      if (error) throw error;
      toast({ title: "✓ משימה עודכנה" });
      setEditingInline(null);
      setSelectedTask(null);
      fetchData();
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    }
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-3">
      {/* ── Header controls ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-card border rounded-lg px-2 py-1.5">
          <button onClick={() => changeDate(-1)} className="p-1 hover:bg-muted rounded"><ChevronRight size={14} /></button>
          <Calendar size={14} className="text-muted-foreground" />
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-sm font-semibold mono border-none outline-none w-[120px]" />
          <button onClick={() => changeDate(1)} className="p-1 hover:bg-muted rounded"><ChevronLeft size={14} /></button>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {(["morning", "evening"] as const).map((s) => (
            <button key={s} onClick={() => setActiveShift(s)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeShift === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
              {s === "morning" ? "☀️ בוקר" : "🌙 ערב"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 mr-auto text-[10px]">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted border border-border" /> טרם</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-warning/40 border border-warning/50" /> בביצוע</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/40 border border-destructive/50" /> חריגה</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success/40 border border-success/50" /> הושלם</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-info/30 border border-info/40" /> נדחה</span>
        </div>
        <span className="text-xs text-muted-foreground">{filteredWorkers.length} עובדים · {tasks.length} משימות</span>
      </div>

      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <GripVertical size={10} /> גרור משימה בין עובדים כדי לשבץ מחדש
      </p>

      {/* ── Board ── */}
      <div className="border rounded-xl bg-card overflow-hidden">
        {/* Top header row */}
        <div className="flex border-b bg-muted/50">
          <div className="shrink-0 flex border-l">
            <div className={`${ISSUE_COL_W} shrink-0 flex items-center justify-center py-2 border-l`}>
              <Zap size={10} className="text-destructive" />
            </div>
            <div className={`${LEFT_PANEL_W} shrink-0 flex items-center px-2 py-2 text-[10px] font-bold text-muted-foreground`}>
              עובד
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="relative w-full">
              <div className="flex h-6 text-[9px] font-bold">
                <div className={`w-full flex items-center justify-center border-l ${activeShift === "morning" ? "bg-info/10 text-info border-info/20" : "bg-accent/10 text-accent-foreground border-accent/20"}`}>
                  {shift.label}
                </div>
              </div>
              <div className="flex h-5 border-t">
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div key={i} className="border-l border-border/50 text-[9px] text-muted-foreground mono flex items-center justify-center" style={{ width: `${100 / TOTAL_HOURS}%` }}>
                    {String(HOUR_START + i).padStart(2, "0")}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex">
          <div className="shrink-0 flex border-l">
            <div>
              {filteredWorkers.length === 0 && (
                <div className="flex items-center justify-center px-4 py-10 text-sm text-muted-foreground">אין עובדים משובצים</div>
              )}
              {filteredWorkers.map((worker) => {
                const workerTickets = ticketsByWorker[worker.id] || [];
                const utilPct = worker.shift_capacity_minutes > 0 ? Math.round((worker.total_planned_minutes / worker.shift_capacity_minutes) * 100) : 0;
                const isDropTarget = dropTargetWorkerId === worker.id;

                return (
                  <div key={worker.assignment_id} className={`flex border-b ${ROW_H} ${isDropTarget ? "bg-primary/10" : ""}`}>
                    <div className={`${ISSUE_COL_W} shrink-0 flex items-center justify-center border-l`}>
                      {workerTickets.length > 0 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-3.5 h-3.5 rounded-full bg-destructive cursor-pointer animate-pulse" />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-[200px]">
                            <p className="text-xs font-bold">{workerTickets[0].description}</p>
                            <p className="text-[10px] text-muted-foreground">{workerTickets[0].location_name}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-success/40" />
                      )}
                    </div>
                    <div className={`${LEFT_PANEL_W} shrink-0 flex flex-col justify-center px-2`}>
                      <p className="text-[11px] font-semibold truncate">{worker.full_name}</p>
                      <p className={`text-[9px] mono ${utilPct > 100 ? "text-destructive font-bold" : utilPct > 90 ? "text-warning" : "text-muted-foreground"}`}>
                        {utilPct}% ניצולת
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="w-full">
              {filteredWorkers.map((worker) => {
                const workerTasks = tasksByWorker[worker.id] || [];
                const isDropTarget = dropTargetWorkerId === worker.id;

                return (
                  <div
                    key={worker.assignment_id}
                    className={`relative border-b ${ROW_H} transition-colors ${isDropTarget ? "bg-primary/5 ring-1 ring-primary/30" : ""}`}
                    onDragOver={(e) => handleDragOver(e, worker.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, worker)}
                  >
                    {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                      <div key={i} className="absolute top-0 bottom-0 border-l border-border/30" style={{ left: `${(i / TOTAL_HOURS) * 100}%` }} />
                    ))}
                    {showNowLine && (
                      <div className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10" style={{ left: `${nowLeftPct}%` }} />
                    )}
                    {workerTasks.map((task) => {
                      const startMin = parseTimeToMinutes(task.window_start) || parseTimeToMinutes(task.started_at);
                      let leftPct: number, widthPct: number;
                      if (startMin === null) {
                        const seqOffset = (task.sequence_order || 0) * task.standard_minutes;
                        const baseStart = HOUR_START * 60;
                        leftPct = minutesToLeftPercent(baseStart + seqOffset, HOUR_START, TOTAL_HOURS);
                        widthPct = minutesToWidthPercent(task.standard_minutes, TOTAL_HOURS);
                      } else {
                        const endMin = parseTimeToMinutes(task.window_end) || (startMin + task.standard_minutes);
                        leftPct = minutesToLeftPercent(startMin, HOUR_START, TOTAL_HOURS);
                        widthPct = minutesToWidthPercent(endMin - startMin, TOTAL_HOURS);
                      }
                      const color = getTileColor(task, now);

                      return (
                        <TaskTileGantt
                          key={task.id}
                          task={task}
                          leftPct={leftPct}
                          widthPct={Math.max(widthPct, 1)}
                          color={color}
                          onClick={() => setSelectedTask(task)}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          isDragging={dragTaskId === task.id}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Task Detail Modal with Quick Actions ── */}
      <Dialog open={!!selectedTask && !showCancelDialog} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-md">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle className="text-right">{selectedTask.task_name}</DialogTitle>
              </DialogHeader>
              <TaskDetailContent task={selectedTask} now={now} />

              {/* Quick Actions */}
              {!["completed", "cancelled"].includes(selectedTask.status) && (
                <div className="border-t pt-4 space-y-3">
                  <p className="text-xs font-bold text-muted-foreground">פעולות מהירות</p>

                  {/* Inline edit form */}
                  {editingInline ? (
                    <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
                      <div>
                        <label className="text-[10px] text-muted-foreground">שם משימה</label>
                        <input
                          value={editingInline.taskName}
                          onChange={(e) => setEditingInline({ ...editingInline, taskName: e.target.value })}
                          className="w-full text-sm rounded-lg border bg-background px-3 py-1.5 mt-0.5"
                          dir="rtl"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">דקות תקן</label>
                        <input
                          type="number"
                          value={editingInline.standardMinutes}
                          onChange={(e) => setEditingInline({ ...editingInline, standardMinutes: Number(e.target.value) })}
                          className="w-full text-sm rounded-lg border bg-background px-3 py-1.5 mt-0.5"
                          min={1}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleInlineEdit(selectedTask.id, {
                            task_name: editingInline.taskName,
                            standard_minutes: editingInline.standardMinutes,
                          })}
                          className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
                        >
                          שמור
                        </button>
                        <button
                          onClick={() => setEditingInline(null)}
                          className="flex-1 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted"
                        >
                          ביטול
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    {/* Edit task */}
                    {!editingInline && (
                      <button
                        onClick={() => setEditingInline({ taskName: selectedTask.task_name, standardMinutes: selectedTask.standard_minutes })}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium hover:bg-muted transition-colors col-span-2"
                      >
                        <ArrowRightLeft size={12} className="text-primary" />
                        ערוך משימה
                      </button>
                    )}

                    {/* Reassign dropdown */}
                    <div className="col-span-2">
                      <label className="text-[10px] text-muted-foreground mb-1 block">שיבוץ מחדש לעובד:</label>
                      <select
                        className="w-full text-xs rounded-lg border bg-background px-3 py-2"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) handleReassign(selectedTask.id, e.target.value);
                        }}
                      >
                        <option value="">בחר עובד...</option>
                        {filteredWorkers
                          .filter(w => w.id !== selectedTask.staff_user_id)
                          .map(w => {
                            const utilPct = w.shift_capacity_minutes > 0 ? Math.round((w.total_planned_minutes / w.shift_capacity_minutes) * 100) : 0;
                            return (
                              <option key={w.id} value={w.id}>
                                {w.full_name} ({utilPct}% ניצולת)
                              </option>
                            );
                          })}
                      </select>
                    </div>

                    {/* Priority toggle */}
                    <button
                      onClick={() => handlePriority(selectedTask.id, selectedTask.priority === "high" ? "normal" : "high")}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                    >
                      <AlertTriangle size={12} className={selectedTask.priority === "high" ? "text-destructive" : "text-muted-foreground"} />
                      {selectedTask.priority === "high" ? "הורד עדיפות" : "העלה עדיפות"}
                    </button>

                    {/* Defer */}
                    <button
                      onClick={() => handleDefer(selectedTask.id)}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                    >
                      <Pause size={12} className="text-info" />
                      השהה / דחה
                    </button>

                    {/* Duplicate */}
                    <button
                      onClick={() => handleDuplicate(selectedTask.id)}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                    >
                      <Copy size={12} className="text-primary" />
                      שכפל משימה
                    </button>

                    {/* Cancel */}
                    <button
                      onClick={() => setShowCancelDialog(true)}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-destructive/30 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <XCircle size={12} />
                      בטל משימה
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel reason dialog */}
      <Dialog open={showCancelDialog} onOpenChange={(o) => { if (!o) { setShowCancelDialog(false); setCancelReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-right">ביטול משימה</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-right">נא לציין סיבת ביטול (חובה):</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full border rounded-lg p-3 text-sm bg-background resize-none h-20"
              placeholder="סיבת ביטול..."
              dir="rtl"
            />
            <div className="flex gap-2">
              <button
                onClick={() => selectedTask && handleCancel(selectedTask.id)}
                disabled={!cancelReason.trim()}
                className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium disabled:opacity-50"
              >
                אשר ביטול
              </button>
              <button
                onClick={() => { setShowCancelDialog(false); setCancelReason(""); }}
                className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
              >
                חזור
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Task Tile on Gantt (draggable) ──
const TaskTileGantt = ({
  task, leftPct, widthPct, color, onClick, onDragStart, isDragging,
}: {
  task: CBTask; leftPct: number; widthPct: number; color: TileColor;
  onClick: () => void; onDragStart?: (e: React.DragEvent) => void; isDragging?: boolean;
}) => {
  const canDrag = !["completed", "cancelled"].includes(task.status);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          draggable={canDrag}
          onDragStart={onDragStart}
          onClick={onClick}
          className={`absolute top-1 bottom-1 rounded border text-[8px] font-semibold truncate px-0.5 flex items-center gap-0.5 transition-all hover:ring-1 hover:ring-ring z-[5] ${tileStyles[color]} ${
            task.is_deferred ? "bg-stripes" : ""
          } ${isDragging ? "opacity-40 ring-2 ring-primary" : ""} ${canDrag ? "cursor-grab active:cursor-grabbing" : ""}`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: 18 }}
        >
          {task.priority === "high" && <AlertTriangle size={8} className="shrink-0 text-destructive" />}
          <span className="truncate">{task.location_name || task.task_name}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-right max-w-[220px]">
        <p className="font-bold text-xs">{task.task_name}</p>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin size={9} /> {task.location_name}</p>
        {(task.building_name || task.floor_name) && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Building size={9} />
            {[task.building_name, task.floor_name && `קומה ${task.floor_name}`].filter(Boolean).join(" · ")}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Timer size={9} /> {task.standard_minutes} דק׳ תקן</p>
        {task.started_at && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock size={9} /> {new Date(task.started_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
        {task.defer_count > 0 && (
          <p className="text-[10px] text-info font-bold">נדחה {task.defer_count}×</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

// ── Task Detail Content ──
const TaskDetailContent = ({ task, now }: { task: CBTask; now: Date }) => {
  const elapsed = task.started_at
    ? Math.round((now.getTime() - new Date(task.started_at).getTime()) / 60000)
    : null;
  const variance = elapsed !== null ? Math.round(((elapsed - task.standard_minutes) / task.standard_minutes) * 100) : null;

  const statusLabel: Record<string, string> = {
    queued: "בתור", ready: "מוכן", in_progress: "בביצוע", completed: "הושלם",
    blocked: "חסום", failed: "נכשל", deferred: "נדחה", paused: "מושהה",
    missed: "הוחמצה", cancelled: "בוטלה",
  };

  return (
    <div className="space-y-4 text-right">
      <div className="grid grid-cols-2 gap-3">
        <InfoBlock label="מיקום" value={task.location_name} icon={<MapPin size={12} />} />
        {(task.building_name || task.floor_name) && (
          <InfoBlock label="בניין / קומה" value={[task.building_name, task.floor_name && `קומה ${task.floor_name}`].filter(Boolean).join(" · ")} icon={<Building size={12} />} />
        )}
        <InfoBlock label="סטטוס" value={statusLabel[task.status] || task.status} icon={<Clock size={12} />} />
        <InfoBlock label="תקן (דק׳)" value={String(task.standard_minutes)} icon={<Timer size={12} />} />
        <InfoBlock label="זמן שעבר" value={elapsed !== null ? `${elapsed} דק׳` : "—"} icon={<Timer size={12} />}
          highlight={elapsed !== null && elapsed > task.standard_minutes * 1.15 ? "destructive" : undefined} />
        {task.started_at && (
          <InfoBlock label="התחלה" value={new Date(task.started_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })} icon={<Clock size={12} />} />
        )}
        {task.finished_at && (
          <InfoBlock label="סיום" value={new Date(task.finished_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })} icon={<Clock size={12} />} />
        )}
        {variance !== null && (
          <InfoBlock label="סטייה" value={`${variance > 0 ? "+" : ""}${variance}%`} icon={<AlertTriangle size={12} />}
            highlight={variance > 15 ? "destructive" : variance > 0 ? "warning" : "success"} />
        )}
        <InfoBlock label="עדיפות" value={task.priority === "high" ? "גבוה" : "רגיל"} icon={<AlertTriangle size={12} />} />
      </div>
      {task.is_deferred && (
        <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 text-xs">
          <p className="font-bold text-warning">משימה נדחתה {task.defer_count > 1 ? `(${task.defer_count}×)` : ""}</p>
        </div>
      )}
    </div>
  );
};

const InfoBlock = ({ label, value, icon, highlight }: {
  label: string; value: string; icon: React.ReactNode;
  highlight?: "destructive" | "warning" | "success";
}) => (
  <div className="rounded-lg bg-muted/50 p-2.5">
    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-0.5">{icon} {label}</p>
    <p className={`text-sm font-semibold mono ${
      highlight === "destructive" ? "text-destructive" :
      highlight === "warning" ? "text-warning" :
      highlight === "success" ? "text-success" : ""
    }`}>{value}</p>
  </div>
);

export default VisualControlBoard;
