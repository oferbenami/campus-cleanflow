import { MapPin, Clock, PackageOpen } from "lucide-react";
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
}

const TaskTile = ({ assignment, label, isActive, isCurrent, onTap }: TaskTileProps) => {
  const { t } = useI18n();
  const risk = getSlaRisk(assignment, isActive);
  const style = slaStyles[risk];
  const sched = scheduledTimes[assignment.id];
  const hasStockNeeded = assignment.stockLow && assignment.stockLow.length > 0;

  return (
    <button
      onClick={onTap}
      className={`w-full text-right task-card border-2 ${style.border} ${style.bg} transition-all ${
        isCurrent ? "ring-2 ring-accent shadow-md" : ""
      }`}
    >
      {/* SLA indicator bar */}
      <div className={`h-1 w-full rounded-t-xl -mt-5 -mx-5 mb-3 ${style.indicator}`} style={{ width: "calc(100% + 2.5rem)" }} />

      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {hasStockNeeded && (
            <PackageOpen size={14} className="text-warning" />
          )}
          {assignment.isBreakFix && (
            <span className="status-badge bg-warning/15 text-warning text-[10px] py-0.5 px-1.5">⚡</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-1">
        <MapPin size={14} className="text-muted-foreground shrink-0" />
        <span className="font-bold text-sm truncate">{assignment.task.zone.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs ${
          assignment.task.type === "maintenance" ? "text-info" : "text-accent-foreground"
        }`}>
          {assignment.isBreakFix
            ? t("worker.breakFix")
            : assignment.task.type === "maintenance"
            ? t("analysis.quick")
            : t("analysis.deep")}
        </span>

        {sched && (
          <span className="flex items-center gap-1 text-xs mono text-muted-foreground">
            <Clock size={12} />
            {sched.plannedEnd}
          </span>
        )}
      </div>
    </button>
  );
};

export default TaskTile;
export { getSlaRisk, type SlaRisk };
