import { CheckCircle2, AlertTriangle, Clock, TrendingUp, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { TaskAssignment } from "@/data/mockData";

interface EndOfDayAnalysisProps {
  assignments: TaskAssignment[];
  onClose: () => void;
}

const EndOfDayAnalysis = ({ assignments, onClose }: EndOfDayAnalysisProps) => {
  const completed = assignments.filter((a) => a.status === "completed");
  const overdue = assignments.filter(
    (a) =>
      a.status === "completed" &&
      a.elapsedMinutes !== undefined &&
      a.elapsedMinutes > a.task.estimatedMinutes * 1.15
  );
  const totalPlanned = assignments.reduce((s, a) => s + a.task.estimatedMinutes, 0);
  const totalActual = completed.reduce(
    (s, a) => s + (a.elapsedMinutes || a.task.estimatedMinutes),
    0
  );
  const completionRate = assignments.length > 0 ? Math.round((completed.length / assignments.length) * 100) : 0;
  const efficiency = totalPlanned > 0 ? Math.round((totalPlanned / Math.max(totalActual, 1)) * 100) : 0;

  // Chart data
  const chartData = assignments.map((a) => ({
    name: a.task.zone.name.split(" ").slice(0, 2).join(" "),
    מתוכנן: a.task.estimatedMinutes,
    בפועל: a.elapsedMinutes || 0,
    overdue:
      a.elapsedMinutes !== undefined &&
      a.elapsedMinutes > a.task.estimatedMinutes * 1.15,
  }));

  // Summary table data
  const tableData = assignments.map((a) => ({
    zone: a.task.zone.name,
    planned: a.task.estimatedMinutes,
    actual: a.elapsedMinutes ?? "-",
    status: a.status,
    diff:
      a.elapsedMinutes !== undefined
        ? a.elapsedMinutes - a.task.estimatedMinutes
        : null,
  }));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs opacity-75 uppercase tracking-wider">ניתוח סוף יום</p>
          <h1 className="text-lg font-bold">שרה כהן</h1>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg bg-primary-foreground/10 text-primary-foreground text-sm font-medium"
        >
          חזרה
        </button>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* KPI row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="kpi-card text-center">
            <CheckCircle2 size={20} className="mx-auto mb-1 text-success" />
            <p className="text-2xl font-bold mono">{completionRate}%</p>
            <p className="text-xs text-muted-foreground">אחוז השלמה</p>
          </div>
          <div className="kpi-card text-center">
            <TrendingUp size={20} className="mx-auto mb-1 text-info" />
            <p className="text-2xl font-bold mono">{efficiency}%</p>
            <p className="text-xs text-muted-foreground">יעילות</p>
          </div>
          <div className="kpi-card text-center">
            <Clock size={20} className="mx-auto mb-1 text-accent" />
            <p className="text-2xl font-bold mono">{totalActual}/{totalPlanned}</p>
            <p className="text-xs text-muted-foreground">דק׳ בפועל/מתוכנן</p>
          </div>
          <div className="kpi-card text-center">
            <AlertTriangle size={20} className="mx-auto mb-1 text-destructive" />
            <p className="text-2xl font-bold mono">{overdue.length}</p>
            <p className="text-xs text-muted-foreground">חריגות SLA</p>
          </div>
        </div>

        {/* Bar chart */}
        <div className="task-card">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={16} />
            <p className="text-sm font-semibold">מתוכנן מול בפועל</p>
          </div>
          <div className="h-48" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="מתוכנן" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="בפועל" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.overdue ? "hsl(var(--destructive))" : "hsl(var(--success))"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detail table */}
        <div className="task-card overflow-x-auto">
          <p className="text-sm font-semibold mb-3">פירוט משימות</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right">
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">מיקום</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">מתוכנן</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">בפועל</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">הפרש</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 px-2 text-xs font-medium truncate max-w-[100px]">{row.zone}</td>
                  <td className="py-2 px-2 mono text-xs">{row.planned} דק׳</td>
                  <td className="py-2 px-2 mono text-xs">{row.actual === "-" ? "-" : `${row.actual} דק׳`}</td>
                  <td className={`py-2 px-2 mono text-xs ${
                    row.diff === null ? "" : row.diff > 0 ? "text-destructive" : "text-success"
                  }`}>
                    {row.diff === null ? "-" : row.diff > 0 ? `+${row.diff}` : row.diff}
                  </td>
                  <td className="py-2 px-2">
                    <span className={`status-badge text-[10px] ${
                      row.status === "completed" ? "status-active" :
                      row.status === "overdue" ? "status-overdue" :
                      row.status === "in_progress" ? "bg-info/15 text-info" :
                      "status-pending"
                    }`}>
                      {row.status === "completed" ? "הושלם" :
                       row.status === "overdue" ? "חריגה" :
                       row.status === "in_progress" ? "בביצוע" : "ממתין"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EndOfDayAnalysis;
