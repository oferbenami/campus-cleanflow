import { CheckCircle2, Clock, AlertTriangle, XCircle, Pause, ArrowRight, X, PauseCircle } from "lucide-react";
import type { AssignedTaskRow } from "@/hooks/useStaffAssignment";

interface Props {
  tasks: AssignedTaskRow[];
  onClose: () => void;
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

const FullTaskBoard = ({ tasks, onClose }: Props) => {
  const completed = tasks.filter(t => t.status === "completed").length;

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

      <div className="flex-1 p-3 grid grid-cols-2 gap-2.5 auto-rows-min">
        {tasks.map((task, i) => {
          const cfg = statusConfig[task.status] || statusConfig.queued;
          const variance = task.variance_percent;
          return (
            <div
              key={task.id}
              className={`rounded-xl border ${cfg.border} ${cfg.bg} p-3 flex flex-col gap-1.5 transition-all`}
            >
              <div className="flex items-start justify-between gap-1">
                <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                  #{i + 1}
                </span>
                {cfg.icon}
              </div>
              <p className="text-sm font-bold text-foreground leading-tight line-clamp-2">{task.task_name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{task.location_name}</p>
              <div className="flex items-center justify-between mt-auto pt-1">
                <span className="text-[10px] text-muted-foreground">{task.standard_minutes} דק׳</span>
                {task.status === "completed" && variance !== null && (
                  <span className={`text-[10px] font-bold ${variance > 10 ? "text-destructive" : variance < -5 ? "text-success" : "text-muted-foreground"}`}>
                    {variance > 0 ? "+" : ""}{variance}%
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FullTaskBoard;
