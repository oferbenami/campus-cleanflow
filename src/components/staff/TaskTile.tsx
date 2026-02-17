import { MapPin, Clock, PackageOpen, Timer, AlertTriangle, Building, Play, Square } from "lucide-react";
import type { TaskAssignment } from "@/data/mockData";
import { scheduledTimes } from "@/data/staffSchedule";
import { useI18n } from "@/i18n/I18nContext";

type SlaRisk = "green" | "orange" | "red" | "gray";

function getSlaRisk(assignment: TaskAssignment, isActive: boolean): SlaRisk {
  if (assignment.status === "completed") return "green";
  if (assignment.status === "overdue") return "red";
  if (!isActive && assignment.status === "pending") return "gray";

  if (assignment.elapsedMinutes !== undefined) {
    const ratio = assignment.elapsedMinutes / assignment.task.estimatedMinutes;
    if (ratio >= 1.15) return "red";
    if (ratio >= 0.8) return "orange";
  }
  return "green";
}

const slaStyles: Record<SlaRisk, { border: string; bg: string; indicator: string; text: string }> = {
  green: {
    border: "border-success/50",
    bg: "bg-success/5",
    indicator: "bg-success",
    text: "text-success",
  },
  orange: {
    border: "border-warning/50",
    bg: "bg-warning/5",
    indicator: "bg-warning",
    text: "text-warning",
  },
  red: {
    border: "border-destructive/50",
    bg: "bg-destructive/5",
    indicator: "bg-destructive",
    text: "text-destructive",
  },
  gray: {
    border: "border-border",
    bg: "bg-muted/30",
    indicator: "bg-muted-foreground",
    text: "text-muted-foreground",
  },
};

interface TaskTileProps {
  assignment: TaskAssignment;
  label: string;
  isActive: boolean;
  isCurrent: boolean;
  onTap?: () => void;
  onReportIssue?: () => void;
  onStart?: () => void;
  onFinish?: () => void;
  orderNumber?: number;
  totalTasks?: number;
  taskTimeDisplay?: string;
}

const TaskTile = ({ assignment, label, isActive, isCurrent, onTap, onReportIssue, onStart, onFinish, orderNumber, totalTasks, taskTimeDisplay }: TaskTileProps) => {
  const { t } = useI18n();
  const risk = getSlaRisk(assignment, isActive);
  const style = slaStyles[risk];
  const sched = scheduledTimes[assignment.id];
  const hasStockNeeded = assignment.stockLow && assignment.stockLow.length > 0;
  const isUrgent = assignment.priority === "urgent" || assignment.isBreakFix;

  return (
    <div
      className={`w-full text-right task-card border-2 ${style.border} ${style.bg} transition-all ${
        isCurrent ? "ring-2 ring-accent shadow-md" : ""
      }`}
    >
      {/* SLA indicator bar */}
      <div className={`h-1 w-full rounded-t-xl -mt-5 -mx-5 mb-3 ${style.indicator}`} style={{ width: "calc(100% + 2.5rem)" }} />

      <button onClick={onTap} className="w-full text-right">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Route order number */}
            {orderNumber !== undefined && (
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                {orderNumber}
              </span>
            )}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Priority badge */}
            {isUrgent ? (
              <span className="status-badge bg-destructive/15 text-destructive text-[10px] py-0.5 px-1.5 font-bold animate-pulse">
                {t("worker.priorityUrgent")}
              </span>
            ) : (
              <span className="status-badge bg-muted text-muted-foreground text-[10px] py-0.5 px-1.5">
                {t("worker.priorityNormal")}
              </span>
            )}
            {hasStockNeeded && (
              <PackageOpen size={14} className="text-warning" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <MapPin size={14} className="text-muted-foreground shrink-0" />
          <span className="font-bold text-sm truncate">{assignment.task.zone.name}</span>
        </div>

        {/* Building/floor breadcrumb */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1.5">
          <Building size={10} />
          <span>אגף {assignment.task.zone.wing} · קומה {assignment.task.zone.floor}</span>
          {assignment.task.zone.roomType && (
            <>
              <span>·</span>
              <span>{assignment.task.zone.roomType}</span>
            </>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-xs ${
              assignment.task.type === "maintenance" ? "text-info" : "text-accent-foreground"
            }`}>
              {assignment.isBreakFix
                ? t("worker.breakFix")
                : assignment.task.type === "maintenance"
                ? t("analysis.quick")
                : t("analysis.deep")}
            </span>
            {/* Estimated duration + time remaining */}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Timer size={12} />
              {isActive && assignment.elapsedMinutes !== undefined ? (
                <span className={`mono font-semibold ${
                  assignment.elapsedMinutes > assignment.task.estimatedMinutes ? "text-destructive" :
                  assignment.elapsedMinutes > assignment.task.estimatedMinutes * 0.8 ? "text-warning" : "text-success"
                }`}>
                  {Math.max(0, assignment.task.estimatedMinutes - assignment.elapsedMinutes)} דק׳ נותרו
                </span>
              ) : (
                <span>{assignment.task.estimatedMinutes} {t("common.minutes")}</span>
              )}
            </span>
          </div>

          {sched && (
            <span className="flex items-center gap-1 text-xs mono text-muted-foreground">
              <Clock size={12} />
              {sched.plannedStart}–{sched.plannedEnd}
            </span>
          )}
        </div>
      </button>

      {/* Start / Finish buttons inside the tile for current task */}
      {isCurrent && !isActive && onStart && (
        <button
          onClick={(e) => { e.stopPropagation(); onStart(); }}
          className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-success text-success-foreground font-bold text-sm hover:bg-success/90 transition-colors"
        >
          <Play size={18} />
          {t("worker.start")}
        </button>
      )}
      {isCurrent && isActive && (
        <div className="mt-3 space-y-2">
          {taskTimeDisplay && (
            <div className="flex items-center justify-center gap-2 py-1">
              <Timer size={14} className="text-primary" />
              <span className="mono text-lg font-bold text-foreground">{taskTimeDisplay}</span>
            </div>
          )}
          {onFinish && (
            <button
              onClick={(e) => { e.stopPropagation(); onFinish(); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              <Square size={18} />
              {t("worker.complete")}
            </button>
          )}
        </div>
      )}

      {/* Report issue quick button - only on current active task */}
      {isCurrent && onReportIssue && (
        <button
          onClick={(e) => { e.stopPropagation(); onReportIssue(); }}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors"
        >
          <AlertTriangle size={14} />
          {t("worker.reportIssue")}
        </button>
      )}
    </div>
  );
};

export default TaskTile;
export { getSlaRisk, type SlaRisk };
