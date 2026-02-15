import { ArrowRight, MapPin, Clock, AlertTriangle, CheckCircle2, Play, Timer } from "lucide-react";
import type { TaskAssignment, StaffMember } from "@/data/mockData";

type DrillDownType = "staff" | "completed" | "inProgress" | "overdue" | "sla";

interface DrillDownPanelProps {
  type: DrillDownType;
  assignments: TaskAssignment[];
  staff: StaffMember[];
  onClose: () => void;
}

const titles: Record<DrillDownType, string> = {
  staff: "עובדים פעילים",
  completed: "משימות שהושלמו",
  inProgress: "משימות בביצוע",
  overdue: "חריגות SLA",
  sla: "דוח SLA מפורט",
};

const DrillDownPanel = ({ type, assignments, staff, onClose }: DrillDownPanelProps) => {
  const filtered = (() => {
    switch (type) {
      case "completed": return assignments.filter((a) => a.status === "completed");
      case "inProgress": return assignments.filter((a) => a.status === "in_progress");
      case "overdue": return assignments.filter((a) => a.status === "overdue");
      case "sla": return assignments.filter(
        (a) => a.elapsedMinutes !== undefined && a.elapsedMinutes > a.task.estimatedMinutes * 1.15
      );
      default: return [];
    }
  })();

  const activeStaff = staff.filter((s) => s.role === "staff");

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-16 px-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-bold">{titles[type]}</h2>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-muted text-sm font-medium hover:bg-muted/80 transition-colors">
            סגור
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 space-y-3">
          {type === "staff" ? (
            activeStaff.map((s) => {
              const staffAssignments = assignments.filter((a) => a.staff.id === s.id);
              const done = staffAssignments.filter((a) => a.status === "completed").length;
              return (
                <div key={s.id} className="rounded-xl border border-border p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    s.status === "active" ? "bg-primary text-primary-foreground" :
                    s.status === "break" ? "bg-accent text-accent-foreground" :
                    "bg-muted text-muted-foreground"
                  }`}>{s.avatar}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {done}/{staffAssignments.length} משימות · סטטוס: {s.status === "active" ? "פעיל" : s.status === "break" ? "הפסקה" : "לא פעיל"}
                    </p>
                  </div>
                </div>
              );
            })
          ) : type === "sla" ? (
            <SLATable assignments={assignments} />
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">אין נתונים להצגה</p>
          ) : (
            filtered.map((a) => (
              <AssignmentRow key={a.id} assignment={a} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const AssignmentRow = ({ assignment: a }: { assignment: TaskAssignment }) => {
  const isOvertime = a.elapsedMinutes !== undefined && a.elapsedMinutes > a.task.estimatedMinutes * 1.15;
  return (
    <div className={`rounded-xl border p-4 ${isOvertime ? "grid-row-overdue" : "border-border"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`status-badge text-[10px] ${
            a.status === "completed" ? "status-active" :
            a.status === "in_progress" ? "bg-info/15 text-info" :
            a.status === "overdue" ? "status-overdue" : "status-pending"
          }`}>
            {a.status === "completed" ? "הושלם" : a.status === "in_progress" ? "בביצוע" : a.status === "overdue" ? "חריגה" : "ממתין"}
          </span>
          <span className="text-xs text-muted-foreground">{a.staff.name}</span>
        </div>
        {a.elapsedMinutes !== undefined && (
          <span className="mono text-xs text-muted-foreground flex items-center gap-1">
            <Timer size={12} />
            {a.elapsedMinutes}/{a.task.estimatedMinutes} דק׳
          </span>
        )}
      </div>
      <p className="font-semibold text-sm">{a.task.name}</p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
        <MapPin size={11} />
        <span>{a.task.zone.name} · אגף {a.task.zone.wing} · קומה {a.task.zone.floor}</span>
      </div>
      {a.issues && a.issues.length > 0 && (
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {a.issues.map((issue, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-destructive/10 text-destructive font-medium">
              {issue}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const SLATable = ({ assignments }: { assignments: TaskAssignment[] }) => {
  const rows = assignments
    .filter((a) => a.elapsedMinutes !== undefined)
    .map((a) => ({
      ...a,
      diff: (a.elapsedMinutes || 0) - a.task.estimatedMinutes,
      pct: Math.round(((a.elapsedMinutes || 0) / a.task.estimatedMinutes) * 100),
      breached: (a.elapsedMinutes || 0) > a.task.estimatedMinutes * 1.15,
    }))
    .sort((a, b) => b.pct - a.pct);

  const totalBreached = rows.filter((r) => r.breached).length;
  const totalWithData = rows.length;
  const slaRate = totalWithData > 0 ? Math.round(((totalWithData - totalBreached) / totalWithData) * 100) : 100;

  return (
    <div className="space-y-4">
      {/* SLA summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="kpi-card text-center">
          <p className={`text-2xl font-bold mono ${slaRate >= 90 ? "text-success" : slaRate >= 70 ? "text-warning" : "text-destructive"}`}>{slaRate}%</p>
          <p className="text-xs text-muted-foreground">עמידה ב-SLA</p>
        </div>
        <div className="kpi-card text-center">
          <p className="text-2xl font-bold mono text-destructive">{totalBreached}</p>
          <p className="text-xs text-muted-foreground">חריגות</p>
        </div>
        <div className="kpi-card text-center">
          <p className="text-2xl font-bold mono text-success">{totalWithData - totalBreached}</p>
          <p className="text-xs text-muted-foreground">בזמן</p>
        </div>
      </div>

      {/* Detail table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right">
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">עובד</th>
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">משימה</th>
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">מתוכנן</th>
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">בפועל</th>
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">הפרש</th>
              <th className="py-2 px-2 text-xs text-muted-foreground font-medium">SLA</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/50">
                <td className="py-2 px-2 text-xs font-medium">{r.staff.name}</td>
                <td className="py-2 px-2 text-xs truncate max-w-[120px]">{r.task.zone.name}</td>
                <td className="py-2 px-2 mono text-xs">{r.task.estimatedMinutes} דק׳</td>
                <td className="py-2 px-2 mono text-xs">{r.elapsedMinutes} דק׳</td>
                <td className={`py-2 px-2 mono text-xs ${r.diff > 0 ? "text-destructive" : "text-success"}`}>
                  {r.diff > 0 ? `+${r.diff}` : r.diff}
                </td>
                <td className="py-2 px-2">
                  {r.breached ? (
                    <span className="status-badge status-overdue text-[10px]">חריגה</span>
                  ) : (
                    <span className="status-badge status-active text-[10px]">תקין</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DrillDownPanel;
