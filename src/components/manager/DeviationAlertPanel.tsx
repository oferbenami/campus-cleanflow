import { AlertTriangle, Clock, RefreshCw, TrendingUp } from "lucide-react";
import type { TaskAssignment } from "@/data/mockData";

interface DeviationAlert {
  type: "time_excess" | "multi_delay" | "repeat_issue";
  severity: "warning" | "critical";
  title: string;
  description: string;
  staffName?: string;
}

function detectDeviations(assignments: TaskAssignment[]): DeviationAlert[] {
  const alerts: DeviationAlert[] = [];

  // 1. Tasks exceeding planned time by >20%
  assignments.forEach((a) => {
    if (
      a.elapsedMinutes !== undefined &&
      a.status !== "pending" &&
      a.elapsedMinutes > a.task.estimatedMinutes * 1.2
    ) {
      const excess = Math.round(
        ((a.elapsedMinutes - a.task.estimatedMinutes) / a.task.estimatedMinutes) * 100
      );
      alerts.push({
        type: "time_excess",
        severity: excess > 50 ? "critical" : "warning",
        title: `חריגת זמן ${excess}%`,
        description: `${a.task.zone.name} — ${a.staff.name} (${a.elapsedMinutes} דק׳ מתוך ${a.task.estimatedMinutes})`,
        staffName: a.staff.name,
      });
    }
  });

  // 2. Worker has 3+ delayed tasks same shift
  const staffDelays: Record<string, { name: string; count: number }> = {};
  assignments.forEach((a) => {
    if (
      a.elapsedMinutes !== undefined &&
      a.elapsedMinutes > a.task.estimatedMinutes * 1.15
    ) {
      if (!staffDelays[a.staff.id]) staffDelays[a.staff.id] = { name: a.staff.name, count: 0 };
      staffDelays[a.staff.id].count++;
    }
  });
  Object.entries(staffDelays).forEach(([, { name, count }]) => {
    if (count >= 3) {
      alerts.push({
        type: "multi_delay",
        severity: "critical",
        title: `${count} משימות מאוחרות`,
        description: `${name} — ${count} חריגות באותה משמרת`,
        staffName: name,
      });
    }
  });

  // 3. Same room generates repeat issue same day
  const roomIssues: Record<string, number> = {};
  assignments.forEach((a) => {
    if (a.issues && a.issues.length > 0) {
      const key = a.task.zone.id;
      roomIssues[key] = (roomIssues[key] || 0) + a.issues.length;
    }
  });
  Object.entries(roomIssues).forEach(([zoneId, count]) => {
    if (count >= 2) {
      const zone = assignments.find((a) => a.task.zone.id === zoneId)?.task.zone;
      alerts.push({
        type: "repeat_issue",
        severity: "warning",
        title: "תקלה חוזרת",
        description: `${zone?.name || zoneId} — ${count} תקלות באותו יום`,
      });
    }
  });

  // Sort by severity
  return alerts.sort((a, b) => (a.severity === "critical" ? -1 : 1) - (b.severity === "critical" ? -1 : 1));
}

const alertIcons: Record<string, React.ReactNode> = {
  time_excess: <Clock size={14} />,
  multi_delay: <TrendingUp size={14} />,
  repeat_issue: <RefreshCw size={14} />,
};

const DeviationAlertPanel = ({ assignments }: { assignments: TaskAssignment[] }) => {
  const alerts = detectDeviations(assignments);

  if (alerts.length === 0) {
    return (
      <div className="task-card">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={18} className="text-success" />
          <h3 className="font-bold text-sm">התרעות סטייה</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">✓ אין סטיות חריגות</p>
      </div>
    );
  }

  return (
    <div className="task-card border-warning/30 border-2">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} className="text-warning" />
        <h3 className="font-bold text-sm">התרעות סטייה</h3>
        <span className="status-badge bg-warning/15 text-warning text-[10px] mr-auto">
          {alerts.length} התרעות
        </span>
      </div>
      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-2.5 rounded-lg ${
              alert.severity === "critical"
                ? "bg-destructive/10 border border-destructive/20"
                : "bg-warning/10 border border-warning/20"
            }`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              alert.severity === "critical"
                ? "bg-destructive/20 text-destructive"
                : "bg-warning/20 text-warning"
            }`}>
              {alertIcons[alert.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold ${
                alert.severity === "critical" ? "text-destructive" : "text-warning"
              }`}>
                {alert.title}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{alert.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeviationAlertPanel;
export { detectDeviations, type DeviationAlert };
