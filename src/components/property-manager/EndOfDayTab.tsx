import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SITE_ID } from "@/hooks/usePropertyManagerData";
import {
  CheckCircle2, AlertTriangle, Clock, TrendingUp, BarChart3, Users, Timer, Star,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import ExecutiveAreasChecklist from "./ExecutiveAreasChecklist";
import SiteReadinessChecklist from "./SiteReadinessChecklist";
import ShiftSiteScorePanel from "./ShiftSiteScorePanel";

/* ─── Data fetching ─── */

function useEndOfDayData(date: string) {
  return useQuery({
    queryKey: ["pm-eod", date],
    queryFn: async () => {
      // 1. Assignments for the date
      const { data: assignments } = await supabase
        .from("assignments")
        .select("id, staff_user_id, template_id, shift_type, status")
        .eq("site_id", SITE_ID)
        .eq("date", date);

      const hasAssignments = (assignments?.length || 0) > 0;

      let tasks: any[] = [];
      let profiles: any[] = [];
      let locations: any[] = [];
      let audits: any[] = [];

      if (hasAssignments) {
        const assignmentIds = assignments!.map((a) => a.id);
        const staffIds = [...new Set(assignments!.map((a) => a.staff_user_id))];

        // 2. Assigned tasks
        const { data: tasksData } = await supabase
          .from("assigned_tasks")
          .select("id, assignment_id, task_name, location_id, standard_minutes, actual_minutes, variance_percent, status, started_at, finished_at, priority, sequence_order")
          .in("assignment_id", assignmentIds);
        tasks = tasksData || [];

        // 3. Staff profiles
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_initials")
          .in("id", staffIds);
        profiles = profilesData || [];

        // 4. Location names
        const locationIds = [...new Set(tasks.map((t: any) => t.location_id))];
        const { data: locationsData } = await supabase
          .from("campus_locations")
          .select("id, name, space_type")
          .in("id", locationIds.length ? locationIds : ["_"]);
        locations = locationsData || [];

        // 5. Audit inspections for these tasks
        const taskIds = tasks.map((t: any) => t.id);
        const { data: auditsData } = await supabase
          .from("audit_inspections")
          .select("id, assigned_task_id, total_score, scores_json")
          .in("assigned_task_id", taskIds.length ? taskIds : ["_"]);
        audits = auditsData || [];
      }

      return {
        assignments: assignments || [],
        tasks,
        profiles,
        locations,
        audits,
        noAssignments: !hasAssignments,
      };
    },
  });
}

/* ─── Component ─── */

const EndOfDayTab = () => {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate] = useState(today);
  const { data, isLoading } = useEndOfDayData(selectedDate);

  const computed = useMemo(() => {
    if (!data) return null;

    const { tasks, profiles, locations, audits, assignments } = data;
    const locMap = Object.fromEntries(locations.map((l) => [l.id, l]));
    const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

    // Task stats
    const completed = tasks.filter((t) => t.status === "completed");
    const inProgress = tasks.filter((t) => t.status === "in_progress");
    const queued = tasks.filter((t) => ["queued", "ready"].includes(t.status));
    const failed = tasks.filter((t) => t.status === "failed" || t.status === "blocked");

    const totalPlanned = tasks.reduce((s, t) => s + t.standard_minutes, 0);
    const totalActual = tasks.reduce((s, t) => s + (t.actual_minutes || 0), 0);
    const completionRate = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;
    const efficiency = totalActual > 0 ? Math.round((totalPlanned / totalActual) * 100) : 0;

    // SLA: breach if variance_percent > 15
    const tasksWithActual = tasks.filter((t) => t.actual_minutes !== null);
    const slaBreach = tasksWithActual.filter((t) => (t.variance_percent || 0) > 15);
    const slaRate = tasksWithActual.length > 0
      ? Math.round(((tasksWithActual.length - slaBreach.length) / tasksWithActual.length) * 100)
      : 100;

    // Audit avg
    const auditAvg = audits.length > 0
      ? Math.round((audits.reduce((s, a) => s + Number(a.total_score), 0) / audits.length) * 10) / 10
      : null;

    // Pie data
    const pieData = [
      { name: "הושלם", value: completed.length, fill: "hsl(var(--success))" },
      { name: "בביצוע", value: inProgress.length, fill: "hsl(var(--info))" },
      { name: "כשל/חסום", value: failed.length, fill: "hsl(var(--destructive))" },
      { name: "ממתין", value: queued.length, fill: "hsl(var(--muted-foreground))" },
    ].filter((d) => d.value > 0);

    // Per-staff data
    const staffData = profiles.map((p) => {
      const staffAssignments = assignments.filter((a) => a.staff_user_id === p.id);
      const staffAssignmentIds = staffAssignments.map((a) => a.id);
      const staffTasks = tasks.filter((t) => staffAssignmentIds.includes(t.assignment_id));
      const done = staffTasks.filter((t) => t.status === "completed").length;
      const planned = staffTasks.reduce((s, t) => s + t.standard_minutes, 0);
      const actual = staffTasks.reduce((s, t) => s + (t.actual_minutes || 0), 0);
      const breaches = staffTasks.filter((t) => (t.variance_percent || 0) > 15).length;
      const staffAudits = audits.filter((a) => staffTasks.some((t) => t.id === a.assigned_task_id));
      const avgScore = staffAudits.length > 0
        ? Math.round((staffAudits.reduce((s, a) => s + Number(a.total_score), 0) / staffAudits.length) * 10) / 10
        : null;

      return {
        profile: p,
        done,
        total: staffTasks.length,
        planned,
        actual,
        breaches,
        avgScore,
      };
    });

    // Task-level bar chart
    const taskChartData = tasks.map((t) => ({
      name: locMap[t.location_id]?.name?.split(" ").slice(0, 2).join(" ") || t.task_name.slice(0, 12),
      מתוכנן: t.standard_minutes,
      בפועל: t.actual_minutes || 0,
      overdue: (t.variance_percent || 0) > 15,
    }));

    // Variance by space type
    const spaceTypeMap: Record<string, { planned: number; actual: number; count: number }> = {};
    tasks.forEach((t) => {
      const loc = locMap[t.location_id];
      const st = loc?.space_type || "other";
      if (!spaceTypeMap[st]) spaceTypeMap[st] = { planned: 0, actual: 0, count: 0 };
      spaceTypeMap[st].planned += t.standard_minutes;
      spaceTypeMap[st].actual += (t.actual_minutes || 0);
      spaceTypeMap[st].count += 1;
    });

    const spaceTypeLabels: Record<string, string> = {
      office: "משרד", meeting_room: "חדר ישיבות", restroom: "שירותים",
      kitchenette: "מטבחון", lobby: "לובי", other: "אחר",
    };
    const varianceChart = Object.entries(spaceTypeMap).map(([type, d]) => ({
      name: spaceTypeLabels[type] || type,
      תקן: d.count > 0 ? Math.round(d.planned / d.count) : 0,
      ממוצע: d.count > 0 && d.actual > 0 ? Math.round(d.actual / d.count) : 0,
    })).filter((d) => d.ממוצע > 0);

    // Staff chart
    const staffChartData = staffData.map((s) => ({
      name: s.profile.full_name.split(" ")[0] || s.profile.avatar_initials || "?",
      מתוכנן: s.planned,
      בפועל: s.actual,
    }));

    return {
      completionRate, efficiency, totalPlanned, totalActual,
      slaBreach: slaBreach.length, slaRate, auditAvg,
      pieData, taskChartData, varianceChart, staffChartData, staffData,
      tasks, locMap, profileMap, assignments,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!data || !computed) {
    return (
      <div className="task-card text-center py-16">
        <Clock size={48} className="mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">אין נתונים להיום</h3>
        <p className="text-sm text-muted-foreground">לא נמצאו שיבוצים לתאריך {selectedDate}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2 mb-1">
          <BarChart3 size={20} /> סיכום סוף יום
        </h2>
        <p className="text-sm text-muted-foreground">{new Date(selectedDate).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={<CheckCircle2 size={22} className="text-success" />} value={`${computed.completionRate}%`} label="אחוז השלמה" />
        <KpiCard icon={<TrendingUp size={22} className="text-info" />} value={`${computed.efficiency}%`} label="יעילות" />
        <KpiCard icon={<Clock size={22} className="text-accent" />} value={`${computed.totalActual}`} label={`דק׳ בפועל / ${computed.totalPlanned} תקן`} />
        <KpiCard
          icon={<Timer size={22} className={computed.slaRate >= 90 ? "text-success" : computed.slaRate >= 70 ? "text-warning" : "text-destructive"} />}
          value={`${computed.slaRate}%`}
          label={`עמידה ב-SLA · ${computed.slaBreach} חריגות`}
          valueColor={computed.slaRate >= 90 ? "text-success" : computed.slaRate >= 70 ? "text-warning" : "text-destructive"}
        />
        <KpiCard
          icon={<Star size={22} className="text-warning" />}
          value={computed.auditAvg !== null ? `${computed.auditAvg}` : "—"}
          label="ציון ביקורת ממוצע"
          valueColor={computed.auditAvg !== null ? (computed.auditAvg >= 4 ? "text-success" : computed.auditAvg >= 3 ? "text-warning" : "text-destructive") : ""}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="task-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={16} /> התפלגות סטטוס
          </h3>
          <div className="h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={computed.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {computed.pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="task-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={16} /> סטייה לפי סוג חלל
          </h3>
          {computed.varianceChart.length > 0 ? (
            <div className="h-56" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={computed.varianceChart} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="תקן" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ממוצע" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">אין נתוני ביצוע בפועל עדיין</p>
          )}
        </div>
      </div>

      {/* Task-level chart */}
      <div className="task-card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 size={16} /> תקן מול בפועל — כל המשימות
        </h3>
        <div className="h-56" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={computed.taskChartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="מתוכנן" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="בפועל" radius={[4, 4, 0, 0]}>
                {computed.taskChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.overdue ? "hsl(var(--destructive))" : "hsl(var(--success))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Staff performance chart */}
      <div className="task-card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Users size={16} /> ביצוע לפי עובד (דק׳)
        </h3>
        <div className="h-56" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={computed.staffChartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="מתוכנן" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="בפועל" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Staff summary table */}
      <div className="task-card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Users size={16} /> סיכום ביצוע לפי עובד
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right">
                <th className="py-2 px-3 text-xs text-muted-foreground font-medium">עובד</th>
                <th className="py-2 px-3 text-xs text-muted-foreground font-medium">הושלמו</th>
                <th className="py-2 px-3 text-xs text-muted-foreground font-medium">תקן</th>
                <th className="py-2 px-3 text-xs text-muted-foreground font-medium">בפועל</th>
                <th className="py-2 px-3 text-xs text-muted-foreground font-medium">הפרש</th>
                <th className="py-2 px-3 text-xs text-muted-foreground font-medium">SLA</th>
                <th className="py-2 px-3 text-xs text-muted-foreground font-medium">ציון ביקורת</th>
                <th className="py-2 px-3 text-xs text-muted-foreground font-medium">יעילות</th>
              </tr>
            </thead>
            <tbody>
              {computed.staffData.map((row) => {
                const diff = row.actual - row.planned;
                const eff = row.actual > 0 ? Math.round((row.planned / row.actual) * 100) : 0;
                return (
                  <tr key={row.profile.id} className="border-b border-border/50">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                          {row.profile.avatar_initials || "?"}
                        </div>
                        <span className="font-medium text-sm">{row.profile.full_name}</span>
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
                      {row.avgScore !== null ? (
                        <div className="flex items-center gap-1">
                          <Star size={12} className="text-warning fill-warning" />
                          <span className={`mono text-sm font-semibold ${row.avgScore >= 4 ? "text-success" : row.avgScore >= 3 ? "text-warning" : "text-destructive"}`}>
                            {row.avgScore}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`mono text-sm font-semibold ${eff >= 90 ? "text-success" : eff >= 70 ? "text-warning" : "text-destructive"}`}>
                        {row.actual > 0 ? `${eff}%` : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full task detail */}
      <div className="task-card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 size={16} /> פירוט משימות
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right">
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">משימה</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">מיקום</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">תקן</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">בפועל</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">סטייה</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">סטטוס</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">SLA</th>
              </tr>
            </thead>
            <tbody>
              {computed.tasks.map((t) => {
                const loc = computed.locMap[t.location_id];
                const variance = t.variance_percent;
                const breached = (variance || 0) > 15;
                const statusLabels: Record<string, string> = {
                  completed: "הושלם", in_progress: "בביצוע", queued: "ממתין",
                  ready: "מוכן", blocked: "חסום", failed: "נכשל",
                };
                const statusStyles: Record<string, string> = {
                  completed: "status-active", in_progress: "bg-info/15 text-info",
                  queued: "status-pending", ready: "bg-info/15 text-info",
                  blocked: "status-overdue", failed: "status-overdue",
                };

                return (
                  <tr key={t.id} className="border-b border-border/50">
                    <td className="py-2 px-2 text-xs font-medium">{t.task_name}</td>
                    <td className="py-2 px-2 text-xs truncate max-w-[120px]">{loc?.name || "—"}</td>
                    <td className="py-2 px-2 mono text-xs">{t.standard_minutes} דק׳</td>
                    <td className="py-2 px-2 mono text-xs">{t.actual_minutes !== null ? `${t.actual_minutes} דק׳` : "—"}</td>
                    <td className={`py-2 px-2 mono text-xs ${variance === null ? "" : (variance || 0) > 0 ? "text-destructive" : "text-success"}`}>
                      {variance !== null ? `${Number(variance) > 0 ? "+" : ""}${Math.round(Number(variance))}%` : "—"}
                    </td>
                    <td className="py-2 px-2">
                      <span className={`status-badge text-[10px] ${statusStyles[t.status] || "status-pending"}`}>
                        {statusLabels[t.status] || t.status}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      {t.actual_minutes !== null ? (
                        breached
                          ? <span className="status-badge status-overdue text-[10px]">חריגה</span>
                          : <span className="status-badge status-active text-[10px]">תקין</span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shift & Site Score */}
      <ShiftSiteScorePanel date={selectedDate} shiftType="morning" />

      {/* Site Readiness Checklist */}
      <SiteReadinessChecklist date={selectedDate} />

      {/* Executive Sensitive Areas */}
      <ExecutiveAreasChecklist date={selectedDate} />
    </div>
  );
};

/* ─── KPI Card ─── */

function KpiCard({ icon, value, label, valueColor }: {
  icon: React.ReactNode; value: string; label: string; valueColor?: string;
}) {
  return (
    <div className="kpi-card text-center">
      <div className="mx-auto mb-1">{icon}</div>
      <p className={`text-3xl font-bold mono ${valueColor || ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default EndOfDayTab;
