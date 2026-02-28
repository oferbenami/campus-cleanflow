import { CheckCircle2, Clock, AlertTriangle, XCircle, Pause, ArrowRight, X, PauseCircle, Play } from "lucide-react";
import type { AssignedTaskRow } from "@/hooks/useStaffAssignment";

interface Props {
  tasks: AssignedTaskRow[];
  onClose: () => void;
  onResumeTask?: (taskId: string) => void;
}

const statusConfig: Record<string, { bg: string; border: string; icon: React.ReactNode; label: string }> = {
  completed: { bg: "bg-success/15", border: "border-success/30", icon: <CheckCircle2 size={18} className="text-success" />, label: "הושלם" },
  in_progress: { bg: "bg-accent/15", border: "border-accent/30", icon: <Clock size={18} className="text-accent animate-pulse" />, label: "בביצוע" },
  queued: { bg: "bg-muted/40", border: "border-border", icon: <ArrowRight size={18} className="text-muted-foreground" />, label: "ממתין" },
  ready: { bg: "bg-muted/40", border: "border-border", icon: <ArrowRight size={18} className="text-muted-foreground" />, label: "מוכן" },
  blocked: { bg: "bg-warning/15", border: "border-warning/30", icon: <Pause size={18} className="text-warning" />, label: "חסום" },
  deferred: { bg: "bg-warning/15", border: "border-warning/30", icon: <PauseCircle size={18} className="text-warning" />, label: "נדחה" },
  paused: { bg: "bg-warning/15", border: "border-warning/30", icon: <PauseCircle size={18} className="text-warning" />, label: "מושהה" },
  missed: { bg: "bg-destructive/15", border: "border-destructive/30", icon: <AlertTriangle size={18} className="text-destructive" />, label: "הוחמצה" },
  failed: { bg: "bg-destructive/15", border: "border-destructive/30", icon: <XCircle size={18} className="text-destructive" />, label: "נכשל" },
};

const FullTaskBoard = ({ tasks, onClose, onResumeTask }: Props) => {
  const completed = tasks.filter(t => t.status === "completed").length;
  const deferredTasks = tasks.filter(t => t.status === "deferred" || t.status === "paused");
  const otherTasks = tasks.filter(t => t.status !== "deferred" && t.status !== "paused");
  const sortedTasks = [...deferredTasks, ...otherTasks];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">לוח משימות מלא</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs opacity-75">{completed}/{tasks.length} הושלמו</span>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20">
            <X size={18} />
          </button>
        </div>
      </header>

      {deferredTasks.length > 0 && (
        <div className="px-3 pt-3">
          <div className="bg-warning/10 border border-warning/30 rounded-lg px-3 py-2 flex items-center gap-2">
            <PauseCircle size={16} className="text-warning shrink-0" />
            <span className="text-xs font-bold text-warning">{deferredTasks.length} משימות נדחו — מוצגות בראש הרשימה</span>
          </div>
        </div>
      )}

      <div className="flex-1 p-3 grid grid-cols-2 gap-2.5 auto-rows-min">
        {sortedTasks.map((task, i) => {
          const cfg = statusConfig[task.status] || statusConfig.queued;
          const variance = task.variance_percent;
          const isDeferred = task.status === "deferred" || task.status === "paused";
          const originalIndex = tasks.indexOf(task);
          return (
            <div
              key={task.id}
              className={`rounded-xl border ${cfg.border} ${cfg.bg} p-3 flex flex-col gap-1.5 transition-all ${isDeferred ? "ring-2 ring-warning/40" : ""}`}
            >
              <div className="flex items-start justify-between gap-1">
                <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                  #{originalIndex + 1}
                </span>
                {cfg.icon}
              </div>
              <p className="text-sm font-bold text-foreground leading-tight line-clamp-2">{task.task_name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{task.location_name}</p>
              {isDeferred && task.defer_reason && (
                <p className="text-[10px] text-warning truncate">סיבה: {task.defer_reason}</p>
              )}
              <div className="flex items-center justify-between mt-auto pt-1">
                <span className="text-[10px] text-muted-foreground">{task.standard_minutes} דק׳</span>
                {task.status === "completed" && variance !== null && (
                  <span className={`text-[10px] font-bold ${variance > 10 ? "text-destructive" : variance < -5 ? "text-success" : "text-muted-foreground"}`}>
                    {variance > 0 ? "+" : ""}{variance}%
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
              </div>
              {isDeferred && onResumeTask && (
                <button
                  onClick={() => onResumeTask(task.id)}
                  className="mt-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
                >
                  <Play size={14} /> המשך משימה
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FullTaskBoard;
