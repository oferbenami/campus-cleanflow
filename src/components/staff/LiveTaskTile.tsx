import { MapPin, Clock, Timer, Building, Play, Square, CheckCircle2, XCircle, AlertTriangle, RotateCcw } from "lucide-react";
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
  onCannotPerform?: () => void;
  onTap?: () => void;
}

function formatWindowTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export type EscalationLevel = "on_track" | "at_risk" | "overdue" | "critical" | "gray" | "done";

export function getEscalationLevel(task: AssignedTaskRow, elapsedMinutes: number): EscalationLevel {
  if (task.status === "completed") return "done";
  if (task.status === "failed" || task.status === "blocked") return "gray";
  if (task.status === "queued" || task.status === "ready") return "gray";

  if (task.status === "in_progress") {
    const ratio = elapsedMinutes / task.standard_minutes;
    if (ratio >= 1.25) return "critical";
    if (ratio >= 1.15) return "overdue";
    if (ratio >= 1.0) return "at_risk";
  }
  return "on_track";
}

const escalationStyles: Record<EscalationLevel, { border: string; bg: string; indicator: string; timerColor: string }> = {
  on_track: { border: "border-success/50", bg: "bg-success/5", indicator: "bg-success", timerColor: "text-success" },
  at_risk: { border: "border-warning/60", bg: "bg-warning/10", indicator: "bg-warning", timerColor: "text-warning" },
  overdue: { border: "border-destructive/60", bg: "bg-destructive/10", indicator: "bg-destructive", timerColor: "text-destructive" },
  critical: { border: "border-destructive", bg: "bg-destructive/15", indicator: "bg-destructive animate-pulse", timerColor: "text-destructive" },
  gray: { border: "border-border", bg: "bg-muted/30", indicator: "bg-muted-foreground", timerColor: "text-muted-foreground" },
  done: { border: "border-success/50", bg: "bg-success/5", indicator: "bg-success", timerColor: "text-success" },
};

const escalationLabels: Record<EscalationLevel, string> = {
  on_track: "בזמן",
  at_risk: "בסיכון",
  overdue: "חריגה",
  critical: "חריגה קריטית",
  gray: "",
  done: "הושלם",
};

const escalationMessages: Record<string, string> = {
  at_risk: "הגעת לזמן התקן. השלם בהקדם.",
  overdue: "חריגה מעל 15%. המפקח קיבל התראה.",
  critical: "חריגה חמורה. יש להשלים מיד.",
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
  onCannotPerform,
  onTap,
}: LiveTaskTileProps) => {
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const level = getEscalationLevel(task, elapsedMinutes);
  const style = escalationStyles[level];
  const isCompleted = task.status === "completed";
  const isBlocked = task.status === "blocked";
  const isDeferred = isBlocked && task.defer_reason;
  const timeDisplay = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`;
  const remainingMinutes = Math.max(0, task.standard_minutes - elapsedMinutes);
  const breadcrumb = [task.grandparent_name, task.parent_name].filter(Boolean).join(" · ");
  const message = escalationMessages[level];

  return (
    <div
      className={`w-full text-right task-card border-2 ${style.border} ${style.bg} transition-all ${
        isCurrent ? "ring-2 ring-accent shadow-md" : ""
      } ${isCompleted ? "opacity-60" : ""} ${isDeferred ? "opacity-70" : ""}`}
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
            {/* Deferred badge */}
            {isDeferred && (
              <span className="status-badge bg-warning/15 text-warning text-[10px] py-0.5 px-1.5 flex items-center gap-1">
                <RotateCcw size={10} /> חובה לחזור
              </span>
            )}
            {/* Escalation badge */}
            {isActive && level !== "on_track" && level !== "gray" && (
              <span className={`status-badge text-[10px] py-0.5 px-1.5 font-bold ${
                level === "at_risk" ? "bg-warning/15 text-warning" :
                level === "overdue" || level === "critical" ? "bg-destructive/15 text-destructive animate-pulse" : ""
              }`}>
                {escalationLabels[level]}
              </span>
            )}
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
            {task.location_space_type && (
              <>
                <span>·</span>
                <span>{task.location_space_type}</span>
              </>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{task.task_name}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Timer size={12} />
              {isActive ? (
                <span className={`mono font-semibold ${style.timerColor}`}>
                  {remainingMinutes > 0 ? `${remainingMinutes} דק׳ נותרו` : `חריגה ${Math.abs(remainingMinutes)} דק׳`}
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

      {/* Escalation warning message */}
      {isActive && message && (
        <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
          level === "at_risk" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
        }`}>
          <AlertTriangle size={14} className="shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Scan to Start button */}
      {isCurrent && !isActive && !isCompleted && task.status !== "failed" && task.status !== "blocked" && onScanToStart && (
        <button
          onClick={(e) => { e.stopPropagation(); onScanToStart(); }}
          className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-success text-success-foreground font-bold text-sm hover:bg-success/90 transition-colors min-h-[48px]"
        >
          <Play size={18} />
          סרוק NFC כדי להתחיל
        </button>
      )}

      {/* Active task: timer + actions */}
      {isCurrent && isActive && (
        <div className="mt-3 space-y-2">
          <div className={`flex items-center justify-center gap-2 py-2 rounded-lg ${
            level === "overdue" || level === "critical" ? "bg-destructive/10" :
            level === "at_risk" ? "bg-warning/10" : ""
          }`}>
            <Timer size={16} className={style.timerColor} />
            <span className={`mono text-2xl font-black ${style.timerColor}`}>{timeDisplay}</span>
            <span className="text-xs text-muted-foreground">/ {task.standard_minutes} דק׳</span>
          </div>
          <Progress
            value={Math.min((elapsedMinutes / task.standard_minutes) * 100, 150)}
            className={`h-2 ${
              level === "overdue" || level === "critical" ? "[&>div]:bg-destructive" :
              level === "at_risk" ? "[&>div]:bg-warning" : "[&>div]:bg-success"
            }`}
          />
          {/* Checklist summary */}
          {task.checklist_json.length > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              ✓ {task.checklist_json.filter(c => c.done).length}/{task.checklist_json.length} פריטים בצ׳ק-ליסט
            </div>
          )}

          {/* Action buttons row */}
          <div className="flex gap-2">
            {/* Cannot Perform */}
            {onCannotPerform && (
              <button
                onClick={(e) => { e.stopPropagation(); onCannotPerform(); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 border-destructive/30 text-destructive font-bold text-sm hover:bg-destructive/10 transition-colors min-h-[48px]"
              >
                <XCircle size={16} />
                לא ניתן
              </button>
            )}
            {/* Scan to Finish */}
            {onScanToFinish && (
              <button
                onClick={(e) => { e.stopPropagation(); onScanToFinish(); }}
                className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors min-h-[48px]"
              >
                <Square size={16} />
                סרוק NFC לסיום
              </button>
            )}
          </div>
        </div>
      )}

      {/* Queued Cannot Perform (before start) */}
      {isCurrent && !isActive && !isCompleted && task.status !== "failed" && task.status !== "blocked" && onCannotPerform && (
        <button
          onClick={(e) => { e.stopPropagation(); onCannotPerform(); }}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-destructive/20 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors min-h-[48px]"
        >
          <XCircle size={16} />
          לא ניתן לבצע
        </button>
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
