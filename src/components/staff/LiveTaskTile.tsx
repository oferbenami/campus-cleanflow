import { MapPin, Clock, Timer, Building, Play, Square, CheckCircle2, AlertTriangle } from "lucide-react";
import type { AssignedTaskRow } from "@/hooks/useStaffAssignment";
import { Progress } from "@/components/ui/progress";

interface LiveTaskTileProps {
  task: AssignedTaskRow;
  isCurrent: boolean;
  isActive: boolean;
  orderNumber: number;
  totalTasks: number;
  elapsedSeconds?: number;
  onScanToStart?: () => void;
  onScanToFinish?: () => void;
  onTap?: () => void;
}

function formatWindowTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type SlaRisk = "green" | "orange" | "red" | "gray";

function getSlaRisk(task: AssignedTaskRow, elapsedMinutes: number): SlaRisk {
  if (task.status === "completed") return "green";
  if (task.status === "failed") return "red";
  if (task.status === "queued" || task.status === "ready") return "gray";

  if (task.status === "in_progress") {
    const ratio = elapsedMinutes / task.standard_minutes;
    if (ratio >= 1.15) return "red";
    if (ratio >= 0.8) return "orange";
  }
  return "green";
}

const slaStyles: Record<SlaRisk, { border: string; bg: string; indicator: string }> = {
  green: { border: "border-success/50", bg: "bg-success/5", indicator: "bg-success" },
  orange: { border: "border-warning/50", bg: "bg-warning/5", indicator: "bg-warning" },
  red: { border: "border-destructive/50", bg: "bg-destructive/5", indicator: "bg-destructive" },
  gray: { border: "border-border", bg: "bg-muted/30", indicator: "bg-muted-foreground" },
};

const LiveTaskTile = ({
  task,
  isCurrent,
  isActive,
  orderNumber,
  totalTasks,
  elapsedSeconds = 0,
  onScanToStart,
  onScanToFinish,
  onTap,
}: LiveTaskTileProps) => {
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const risk = getSlaRisk(task, elapsedMinutes);
  const style = slaStyles[risk];
  const isCompleted = task.status === "completed";
  const timeDisplay = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`;
  const remainingMinutes = Math.max(0, task.standard_minutes - elapsedMinutes);

  // Breadcrumb
  const breadcrumb = [task.grandparent_name, task.parent_name].filter(Boolean).join(" · ");

  return (
    <div
      className={`w-full text-right task-card border-2 ${style.border} ${style.bg} transition-all ${
        isCurrent ? "ring-2 ring-accent shadow-md" : ""
      } ${isCompleted ? "opacity-60" : ""}`}
    >
      {/* SLA indicator bar */}
      <div className={`h-1 w-full rounded-t-xl -mt-5 -mx-5 mb-3 ${style.indicator}`} style={{ width: "calc(100% + 2.5rem)" }} />

      <button onClick={onTap} className="w-full text-right">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
              {orderNumber}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {isCurrent ? "משימה נוכחית" : `משימה ${orderNumber}`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {task.priority === "high" ? (
              <span className="status-badge bg-destructive/15 text-destructive text-[10px] py-0.5 px-1.5 font-bold">
                דחוף
              </span>
            ) : (
              <span className="status-badge bg-muted text-muted-foreground text-[10px] py-0.5 px-1.5">
                רגיל
              </span>
            )}
            {isCompleted && <CheckCircle2 size={16} className="text-success" />}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <MapPin size={14} className="text-muted-foreground shrink-0" />
          <span className="font-bold text-lg truncate">{task.location_name}</span>
        </div>

        {breadcrumb && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1.5">
            <Building size={10} />
            <span>{breadcrumb}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{task.task_name}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Timer size={12} />
              {isActive ? (
                <span className={`mono font-semibold ${
                  elapsedMinutes > task.standard_minutes ? "text-destructive" :
                  elapsedMinutes > task.standard_minutes * 0.8 ? "text-warning" : "text-success"
                }`}>
                  {remainingMinutes} דק׳ נותרו
                </span>
              ) : (
                <span>{task.standard_minutes} דק׳</span>
              )}
            </span>
          </div>

          {task.window_start && task.window_end && (
            <span className="flex items-center gap-1 text-xs mono text-muted-foreground">
              <Clock size={12} />
              {formatWindowTime(task.window_start)}–{formatWindowTime(task.window_end)}
            </span>
          )}
        </div>
      </button>

      {/* Scan to Start button */}
      {isCurrent && !isActive && !isCompleted && task.status !== "failed" && onScanToStart && (
        <button
          onClick={(e) => { e.stopPropagation(); onScanToStart(); }}
          className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-success text-success-foreground font-bold text-sm hover:bg-success/90 transition-colors min-h-[48px]"
        >
          <Play size={18} />
          סרוק NFC כדי להתחיל
        </button>
      )}

      {/* Active task: timer + scan to finish */}
      {isCurrent && isActive && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-center gap-2 py-1">
            <Timer size={14} className="text-primary" />
            <span className="mono text-lg font-bold text-foreground">{timeDisplay}</span>
            <span className="text-xs text-muted-foreground">/ {task.standard_minutes} דק׳</span>
          </div>
          <Progress
            value={Math.min((elapsedMinutes / task.standard_minutes) * 100, 100)}
            className={`h-2 ${risk === "red" ? "[&>div]:bg-destructive" : risk === "orange" ? "[&>div]:bg-warning" : "[&>div]:bg-success"}`}
          />
          {/* Checklist summary */}
          {task.checklist_json.length > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              ✓ {task.checklist_json.filter(c => c.done).length}/{task.checklist_json.length} פריטים בצ׳ק-ליסט
            </div>
          )}
          {onScanToFinish && (
            <button
              onClick={(e) => { e.stopPropagation(); onScanToFinish(); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors min-h-[48px]"
            >
              <Square size={18} />
              סרוק NFC כדי לסיים
            </button>
          )}
        </div>
      )}

      {/* Completed info */}
      {isCompleted && task.actual_minutes !== null && (
        <div className="mt-2 text-xs text-muted-foreground text-center">
          הושלם ב-{task.actual_minutes} דק׳ (תקן: {task.standard_minutes} דק׳)
          {task.variance_percent !== null && (
            <span className={`ml-2 font-semibold ${task.variance_percent > 15 ? "text-destructive" : task.variance_percent < -10 ? "text-info" : "text-success"}`}>
              {task.variance_percent > 0 ? "+" : ""}{task.variance_percent}%
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveTaskTile;
