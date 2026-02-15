import { CheckCircle2, AlertTriangle, Clock, TrendingUp, BarChart3, Users, Timer, ArrowLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { mockAssignments, mockStaff, type TaskAssignment, type StaffMember } from "@/data/mockData";

interface ManagerEndOfDayProps {
  onClose: () => void;
}

const ManagerEndOfDay = ({ onClose }: ManagerEndOfDayProps) => {
  const assignments = mockAssignments;
  const activeStaff = mockStaff.filter((s) => s.role === "staff");

  const completed = assignments.filter((a) => a.status === "completed");
  const inProgress = assignments.filter((a) => a.status === "in_progress");
  const pending = assignments.filter((a) => a.status === "pending");
  const overdue = assignments.filter((a) => a.status === "overdue");

  const totalPlanned = assignments.reduce((s, a) => s + a.task.estimatedMinutes, 0);
  const totalActual = assignments
    .filter((a) => a.elapsedMinutes !== undefined)
    .reduce((s, a) => s + (a.elapsedMinutes || 0), 0);

  const completionRate = assignments.length > 0 ? Math.round((completed.length / assignments.length) * 100) : 0;
  const efficiency = totalActual > 0 ? Math.round((totalPlanned / totalActual) * 100) : 0;

  const slaBreach = assignments.filter(
    (a) => a.elapsedMinutes !== undefined && a.elapsedMinutes > a.task.estimatedMinutes * 1.15
  );
  const slaRate = assignments.filter((a) => a.elapsedMinutes !== undefined).length > 0
    ? Math.round(((assignments.filter((a) => a.elapsedMinutes !== undefined).length - slaBreach.length) / assignments.filter((a) => a.elapsedMinutes !== undefined).length) * 100)
    : 100;

  // Status pie chart
  const pieData = [
    { name: "הושלם", value: completed.length, fill: "hsl(var(--success))" },
    { name: "בביצוע", value: inProgress.length, fill: "hsl(var(--info))" },
    { name: "חריגה", value: overdue.length, fill: "hsl(var(--destructive))" },
    { name: "ממתין", value: pending.length, fill: "hsl(var(--muted-foreground))" },
  ].filter((d) => d.value > 0);

  // Per-staff bar chart
  const staffChartData = activeStaff.map((s) => {
    const sa = assignments.filter((a) => a.staff.id === s.id);
    const planned = sa.reduce((sum, a) => sum + a.task.estimatedMinutes, 0);
    const actual = sa.reduce((sum, a) => sum + (a.elapsedMinutes || 0), 0);
    const done = sa.filter((a) => a.status === "completed").length;
    return { name: s.name.split(" ")[0], מתוכנן: planned, בפועל: actual, done, total: sa.length };
  });

  // Per-task bar chart
  const taskChartData = assignments.map((a) => ({
    name: a.task.zone.name.split(" ").slice(0, 2).join(" "),
    מתוכנן: a.task.estimatedMinutes,
    בפועל: a.elapsedMinutes || 0,
    overdue: a.elapsedMinutes !== undefined && a.elapsedMinutes > a.task.estimatedMinutes * 1.15,
  }));

  // Per-staff detail table
  const staffDetails = activeStaff.map((s) => {
    const sa = assignments.filter((a) => a.staff.id === s.id);
    const done = sa.filter((a) => a.status === "completed").length;
    const planned = sa.reduce((sum, a) => sum + a.task.estimatedMinutes, 0);
    const actual = sa.reduce((sum, a) => sum + (a.elapsedMinutes || 0), 0);
    const breaches = sa.filter((a) => a.elapsedMinutes !== undefined && a.elapsedMinutes > a.task.estimatedMinutes * 1.15).length;
    return { staff: s, done, total: sa.length, planned, actual, breaches };
  });

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs opacity-75 uppercase tracking-wider">ניתוח סוף יום</p>
            <h1 className="text-xl font-bold">סיכום כלל העבודות</h1>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-foreground/10 text-primary-foreground text-sm font-medium hover:bg-primary-foreground/20 transition-colors"
          >
            <ArrowLeft size={16} />
            חזרה ללוח בקרה
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Top KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="kpi-card text-center">
            <CheckCircle2 size={22} className="mx-auto mb-1 text-success" />
            <p className="text-3xl font-bold mono">{completionRate}%</p>
            <p className="text-xs text-muted-foreground">אחוז השלמה</p>
          </div>
          <div className="kpi-card text-center">
            <TrendingUp size={22} className="mx-auto mb-1 text-info" />
            <p className="text-3xl font-bold mono">{efficiency}%</p>
            <p className="text-xs text-muted-foreground">יעילות</p>
          </div>
          <div className="kpi-card text-center">
            <Clock size={22} className="mx-auto mb-1 text-accent" />
            <p className="text-3xl font-bold mono">{totalActual}</p>
            <p className="text-xs text-muted-foreground">דק׳ בפועל / {totalPlanned} מתוכנן</p>
          </div>
          <div className="kpi-card text-center">
            <AlertTriangle size={22} className="mx-auto mb-1 text-destructive" />
            <p className="text-3xl font-bold mono">{slaBreach.length}</p>
            <p className="text-xs text-muted-foreground">חריגות SLA</p>
          </div>
          <div className="kpi-card text-center">
            <Timer size={22} className={`mx-auto mb-1 ${slaRate >= 90 ? "text-success" : slaRate >= 70 ? "text-warning" : "text-destructive"}`} />
            <p className={`text-3xl font-bold mono ${slaRate >= 90 ? "text-success" : slaRate >= 70 ? "text-warning" : "text-destructive"}`}>{slaRate}%</p>
            <p className="text-xs text-muted-foreground">עמידה ב-SLA</p>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status distribution pie */}
          <div className="task-card">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} />
              <h3 className="font-semibold">התפלגות סטטוס משימות</h3>
            </div>
            <div className="h-56" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Per-staff performance bar */}
          <div className="task-card">
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} />
              <h3 className="font-semibold">ביצוע לפי עובד (דק׳)</h3>
            </div>
            <div className="h-56" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffChartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="מתוכנן" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="בפועל" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Task-level bar chart */}
        <div className="task-card">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} />
            <h3 className="font-semibold">מתוכנן מול בפועל — כל המשימות</h3>
          </div>
          <div className="h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskChartData} barGap={2}>
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
                  {taskChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.overdue ? "hsl(var(--destructive))" : "hsl(var(--success))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Staff summary table */}
        <div className="task-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users size={16} />
            סיכום ביצוע לפי עובד
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-right">
                  <th className="py-2 px-3 text-xs text-muted-foreground font-medium">עובד</th>
                  <th className="py-2 px-3 text-xs text-muted-foreground font-medium">הושלמו</th>
                  <th className="py-2 px-3 text-xs text-muted-foreground font-medium">מתוכנן (דק׳)</th>
                  <th className="py-2 px-3 text-xs text-muted-foreground font-medium">בפועל (דק׳)</th>
                  <th className="py-2 px-3 text-xs text-muted-foreground font-medium">הפרש</th>
                  <th className="py-2 px-3 text-xs text-muted-foreground font-medium">חריגות SLA</th>
                  <th className="py-2 px-3 text-xs text-muted-foreground font-medium">יעילות</th>
                </tr>
              </thead>
              <tbody>
                {staffDetails.map((row) => {
                  const diff = row.actual - row.planned;
                  const eff = row.actual > 0 ? Math.round((row.planned / row.actual) * 100) : 0;
                  return (
                    <tr key={row.staff.id} className="border-b border-border/50">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                            {row.staff.avatar}
                          </div>
                          <span className="font-medium text-sm">{row.staff.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 mono text-sm">{row.done}/{row.total}</td>
                      <td className="py-3 px-3 mono text-sm">{row.planned}</td>
                      <td className="py-3 px-3 mono text-sm">{row.actual}</td>
                      <td className={`py-3 px-3 mono text-sm ${diff > 0 ? "text-destructive" : diff < 0 ? "text-success" : ""}`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </td>
                      <td className="py-3 px-3">
                        {row.breaches > 0 ? (
                          <span className="status-badge status-overdue text-[10px]">{row.breaches} חריגות</span>
                        ) : (
                          <span className="status-badge status-active text-[10px]">תקין</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`mono text-sm font-semibold ${eff >= 90 ? "text-success" : eff >= 70 ? "text-warning" : "text-destructive"}`}>
                          {eff}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Full task detail table */}
        <div className="task-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={16} />
            פירוט כל המשימות
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-right">
                  <th className="py-2 px-2 text-xs text-muted-foreground font-medium">עובד</th>
                  <th className="py-2 px-2 text-xs text-muted-foreground font-medium">מיקום</th>
                  <th className="py-2 px-2 text-xs text-muted-foreground font-medium">סוג</th>
                  <th className="py-2 px-2 text-xs text-muted-foreground font-medium">מתוכנן</th>
                  <th className="py-2 px-2 text-xs text-muted-foreground font-medium">בפועל</th>
                  <th className="py-2 px-2 text-xs text-muted-foreground font-medium">הפרש</th>
                  <th className="py-2 px-2 text-xs text-muted-foreground font-medium">סטטוס</th>
                  <th className="py-2 px-2 text-xs text-muted-foreground font-medium">SLA</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => {
                  const diff = a.elapsedMinutes !== undefined ? a.elapsedMinutes - a.task.estimatedMinutes : null;
                  const breached = a.elapsedMinutes !== undefined && a.elapsedMinutes > a.task.estimatedMinutes * 1.15;
                  return (
                    <tr key={a.id} className="border-b border-border/50">
                      <td className="py-2 px-2 text-xs font-medium">{a.staff.name}</td>
                      <td className="py-2 px-2 text-xs truncate max-w-[100px]">{a.task.zone.name}</td>
                      <td className="py-2 px-2 text-xs">{a.task.type === "maintenance" ? "מהיר" : "יסודי"}</td>
                      <td className="py-2 px-2 mono text-xs">{a.task.estimatedMinutes} דק׳</td>
                      <td className="py-2 px-2 mono text-xs">{a.elapsedMinutes !== undefined ? `${a.elapsedMinutes} דק׳` : "-"}</td>
                      <td className={`py-2 px-2 mono text-xs ${diff === null ? "" : diff > 0 ? "text-destructive" : "text-success"}`}>
                        {diff === null ? "-" : diff > 0 ? `+${diff}` : diff}
                      </td>
                      <td className="py-2 px-2">
                        <span className={`status-badge text-[10px] ${
                          a.status === "completed" ? "status-active" :
                          a.status === "in_progress" ? "bg-info/15 text-info" :
                          a.status === "overdue" ? "status-overdue" : "status-pending"
                        }`}>
                          {a.status === "completed" ? "הושלם" : a.status === "in_progress" ? "בביצוע" : a.status === "overdue" ? "חריגה" : "ממתין"}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        {a.elapsedMinutes !== undefined ? (
                          breached ? (
                            <span className="status-badge status-overdue text-[10px]">חריגה</span>
                          ) : (
                            <span className="status-badge status-active text-[10px]">תקין</span>
                          )
                        ) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerEndOfDay;
