import {
  AlertTriangle,
  Flame,
  TrendingDown,
  TrendingUp,
  Gauge,
  Clock,
  BarChart3,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { WorkerWorkload, TaskVariance, VarianceSummary } from "@/lib/scheduling-engine";
import { getHeatLevel } from "@/lib/scheduling-engine";
import type { TaskAssignment } from "@/data/mockData";

/* ─── Workload Heat Indicator ─── */
export const WorkloadHeatPanel = ({ workloads }: { workloads: WorkerWorkload[] }) => {
  const heatColors = {
    cool: "bg-success/15 text-success",
    warm: "bg-warning/15 text-warning",
    hot: "bg-accent/15 text-accent-foreground",
    overload: "bg-destructive/15 text-destructive",
  };

  const heatLabels = {
    cool: "תקין",
    warm: "עמוס",
    hot: "עומס גבוה",
    overload: "חריגת קיבולת",
  };

  return (
    <div className="task-card">
      <div className="flex items-center gap-2 mb-4">
        <Gauge size={18} className="text-accent" />
        <h3 className="font-bold text-sm">עומס עובדים</h3>
      </div>
      <div className="space-y-2.5">
        {workloads.map((w) => {
          const heat = getHeatLevel(w.utilizationPercent);
          return (
            <div key={w.staffId} className="flex items-center gap-3">
              <span className="text-xs font-medium w-24 truncate text-right">{w.staffName}</span>
              <div className="flex-1">
                <Progress
                  value={Math.min(w.utilizationPercent, 100)}
                  className={`h-2.5 ${
                    heat === "cool" ? "[&>div]:bg-success" :
                    heat === "warm" ? "[&>div]:bg-warning" :
                    heat === "hot" ? "[&>div]:bg-accent" :
                    "[&>div]:bg-destructive"
                  }`}
                />
              </div>
              <span className={`text-[10px] font-bold mono w-10 text-left ${
                w.isOverCapacity ? "text-destructive" : "text-muted-foreground"
              }`}>
                {w.utilizationPercent}%
              </span>
              <span className={`status-badge text-[9px] ${heatColors[heat]}`}>
                {heatLabels[heat]}
              </span>
              {w.isOverCapacity && (
                <span className="text-[10px] text-destructive font-bold mono">
                  +{w.excessMinutes} דק׳
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── SLA Risk Alert Panel ─── */
export const SlaRiskPanel = ({
  riskTasks,
}: {
  riskTasks: { assignment: TaskAssignment; risk: string; delayMinutes: number }[];
}) => {
  if (riskTasks.length === 0) {
    return (
      <div className="task-card">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={18} className="text-success" />
          <h3 className="font-bold text-sm">סיכוני SLA</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">✓ אין סיכוני SLA כרגע</p>
      </div>
    );
  }

  return (
    <div className="task-card border-destructive/30 border-2">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} className="text-destructive" />
        <h3 className="font-bold text-sm">סיכוני SLA</h3>
        <span className="status-badge status-overdue text-[10px] mr-auto">{riskTasks.length} משימות</span>
      </div>
      <div className="space-y-2">
        {riskTasks.map((rt) => (
          <div
            key={rt.assignment.id}
            className={`flex items-center gap-3 p-2.5 rounded-lg ${
              rt.risk === "red" ? "bg-destructive/10 border border-destructive/20" : "bg-warning/10 border border-warning/20"
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              rt.risk === "red" ? "bg-destructive" : "bg-warning"
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{rt.assignment.task.zone.name}</p>
              <p className="text-[10px] text-muted-foreground">{rt.assignment.staff.name} · {rt.assignment.task.name}</p>
            </div>
            <div className="text-left">
              <p className={`text-xs font-bold mono ${rt.risk === "red" ? "text-destructive" : "text-warning"}`}>
                +{rt.delayMinutes} דק׳
              </p>
              <p className="text-[10px] text-muted-foreground">
                {rt.risk === "red" ? "חריגת SLA" : "סיכון"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Variance Summary Widget ─── */
export const VarianceWidget = ({ summary }: { summary: VarianceSummary }) => {
  if (summary.totalTasks === 0) {
    return (
      <div className="task-card">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 size={18} className="text-info" />
          <h3 className="font-bold text-sm">סטיות מתקן זמן</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">אין נתוני סטייה עדיין</p>
      </div>
    );
  }

  const avgColor = Math.abs(summary.avgVariancePercent) > 20 ? "text-destructive" : 
                   Math.abs(summary.avgVariancePercent) > 10 ? "text-warning" : "text-success";

  return (
    <div className="task-card">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={18} className="text-info" />
        <h3 className="font-bold text-sm">סטיות מתקן זמן</h3>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <p className={`text-2xl font-bold mono ${avgColor}`}>
            {summary.avgVariancePercent > 0 ? "+" : ""}{summary.avgVariancePercent}%
          </p>
          <p className="text-[10px] text-muted-foreground">ממוצע סטייה</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold mono">{summary.totalTasks}</p>
          <p className="text-[10px] text-muted-foreground">משימות</p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-bold mono ${summary.significantDeviations > 0 ? "text-destructive" : "text-success"}`}>
            {summary.significantDeviations}
          </p>
          <p className="text-[10px] text-muted-foreground">סטיות &gt;20%</p>
        </div>
      </div>

      {/* Top over-standard */}
      {summary.topOverStandard.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <TrendingUp size={10} className="text-destructive" />
            חריגות מובילות
          </p>
          {summary.topOverStandard.map((v, i) => (
            <div key={i} className="flex items-center gap-2 py-1 text-xs">
              <span className="font-medium truncate flex-1">{v.zoneName}</span>
              <span className="text-muted-foreground">{v.staffName}</span>
              <span className="font-bold mono text-destructive">+{v.variancePercent}%</span>
            </div>
          ))}
        </div>
      )}

      {/* By worker summary */}
      {summary.byWorker.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">לפי עובד</p>
          {summary.byWorker.map((w) => (
            <div key={w.staffId} className="flex items-center gap-2 py-1 text-xs">
              <span className="font-medium flex-1">{w.staffName}</span>
              <span className="text-muted-foreground">{w.count} משימות</span>
              <span className={`font-bold mono ${
                Math.abs(w.avgVariance) > 20 ? "text-destructive" : 
                Math.abs(w.avgVariance) > 10 ? "text-warning" : "text-success"
              }`}>
                {w.avgVariance > 0 ? "+" : ""}{w.avgVariance}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
