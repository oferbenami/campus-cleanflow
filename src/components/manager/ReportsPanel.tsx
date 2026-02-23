import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { BarChart3, Star, Clock, Building2, Users, Layers, Filter } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const SITE_ID = "37027ccd-c7d7-4d77-988d-6da914e347b4";

type ReportTab = "quality" | "utilization";

/* ─── Quality Report Hook ─── */
function useQualityReport() {
  return useQuery({
    queryKey: ["report-quality"],
    queryFn: async () => {
      // Get audit inspections with location & staff info
      const { data: inspections } = await supabase
        .from("audit_inspections")
        .select("id, total_score, scores_json, assigned_task_id, inspector_user_id, created_at")
        .eq("site_id", SITE_ID)
        .order("created_at", { ascending: false });

      if (!inspections?.length) return { inspections: [], byLocation: [], bySpaceType: [], byStaff: [], avgScore: 0 };

      // Get the assigned tasks for location info
      const taskIds = [...new Set(inspections.map((i) => i.assigned_task_id))];
      const { data: tasks } = await supabase
        .from("assigned_tasks")
        .select("id, location_id, assignment_id, task_name")
        .in("id", taskIds);

      // Get locations
      const locationIds = [...new Set((tasks || []).map((t) => t.location_id))];
      const { data: locations } = await supabase
        .from("campus_locations")
        .select("id, name, level_type, space_type, parent_location_id")
        .in("id", locationIds);

      // Get staff from assignments
      const assignmentIds = [...new Set((tasks || []).map((t) => t.assignment_id))];
      const { data: assignments } = await supabase
        .from("assignments")
        .select("id, staff_user_id")
        .in("id", assignmentIds);

      const staffIds = [...new Set((assignments || []).map((a) => a.staff_user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_initials")
        .in("id", staffIds);

      // Build maps
      const taskMap = Object.fromEntries((tasks || []).map((t) => [t.id, t]));
      const locMap = Object.fromEntries((locations || []).map((l) => [l.id, l]));
      const assignMap = Object.fromEntries((assignments || []).map((a) => [a.id, a]));
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

      // Aggregate by location
      const locScores: Record<string, { name: string; scores: number[] }> = {};
      const spaceScores: Record<string, { scores: number[] }> = {};
      const staffScores: Record<string, { name: string; initials: string; scores: number[] }> = {};

      inspections.forEach((insp) => {
        const task = taskMap[insp.assigned_task_id];
        if (!task) return;
        const loc = locMap[task.location_id];
        const assignment = assignMap[task.assignment_id];

        if (loc) {
          if (!locScores[loc.id]) locScores[loc.id] = { name: loc.name, scores: [] };
          locScores[loc.id].scores.push(Number(insp.total_score));

          const st = loc.space_type || "other";
          if (!spaceScores[st]) spaceScores[st] = { scores: [] };
          spaceScores[st].scores.push(Number(insp.total_score));
        }

        if (assignment) {
          const profile = profileMap[assignment.staff_user_id];
          if (profile) {
            if (!staffScores[profile.id]) staffScores[profile.id] = { name: profile.full_name, initials: profile.avatar_initials || "?", scores: [] };
            staffScores[profile.id].scores.push(Number(insp.total_score));
          }
        }
      });

      const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10 : 0;

      const byLocation = Object.entries(locScores).map(([id, v]) => ({ id, name: v.name, avg: avg(v.scores), count: v.scores.length })).sort((a, b) => b.avg - a.avg);
      const spaceLabels: Record<string, string> = { office: "משרד", meeting_room: "חדר ישיבות", restroom: "שירותים", kitchenette: "מטבחון", lobby: "לובי", other: "אחר" };
      const bySpaceType = Object.entries(spaceScores).map(([type, v]) => ({ type, label: spaceLabels[type] || type, avg: avg(v.scores), count: v.scores.length })).sort((a, b) => b.avg - a.avg);
      const byStaff = Object.entries(staffScores).map(([id, v]) => ({ id, name: v.name, initials: v.initials, avg: avg(v.scores), count: v.scores.length })).sort((a, b) => b.avg - a.avg);

      const allScores = inspections.map((i) => Number(i.total_score));
      const avgScore = avg(allScores);

      return { inspections, byLocation, bySpaceType, byStaff, avgScore };
    },
  });
}

/* ─── Utilization Report Hook ─── */
function useUtilizationReport() {
  return useQuery({
    queryKey: ["report-utilization"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];

      // Get today's assignments
      const { data: assignments } = await supabase
        .from("assignments")
        .select("id, staff_user_id, shift_type, status, date")
        .eq("site_id", SITE_ID)
        .eq("date", today);

      if (!assignments?.length) return { staffUtilization: [], totalPlanned: 0, totalActual: 0, avgEfficiency: 0 };

      const assignmentIds = assignments.map((a) => a.id);
      const { data: tasks } = await supabase
        .from("assigned_tasks")
        .select("id, assignment_id, standard_minutes, actual_minutes, status, started_at, finished_at, sequence_order")
        .in("assignment_id", assignmentIds)
        .order("sequence_order");

      const staffIds = [...new Set(assignments.map((a) => a.staff_user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_initials, default_shift_start, default_shift_end, default_break_minutes")
        .in("id", staffIds);

      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

      const staffUtilization = assignments.map((asgn) => {
        const profile = profileMap[asgn.staff_user_id];
        const staffTasks = (tasks || []).filter((t) => t.assignment_id === asgn.id);
        const plannedMin = staffTasks.reduce((s, t) => s + t.standard_minutes, 0);
        const actualMin = staffTasks.reduce((s, t) => s + (t.actual_minutes || 0), 0);
        const completedCount = staffTasks.filter((t) => t.status === "completed").length;

        // Compute transition time (gap between consecutive tasks)
        let transitionMin = 0;
        const sorted = [...staffTasks].filter((t) => t.started_at && t.finished_at).sort((a, b) => new Date(a.started_at!).getTime() - new Date(b.started_at!).getTime());
        for (let i = 1; i < sorted.length; i++) {
          const prevEnd = new Date(sorted[i - 1].finished_at!).getTime();
          const nextStart = new Date(sorted[i].started_at!).getTime();
          const gap = (nextStart - prevEnd) / 60000;
          if (gap > 0 && gap < 60) transitionMin += Math.round(gap);
        }

        const breakMin = profile?.default_break_minutes || 30;
        const shiftStart = profile?.default_shift_start || "07:00";
        const shiftEnd = profile?.default_shift_end || "15:00";
        const [sh, sm] = shiftStart.split(":").map(Number);
        const [eh, em] = shiftEnd.split(":").map(Number);
        const shiftTotalMin = (eh * 60 + em) - (sh * 60 + sm);
        const availableMin = shiftTotalMin - breakMin;
        const utilizationPct = availableMin > 0 ? Math.round((actualMin / availableMin) * 100) : 0;
        const efficiency = plannedMin > 0 ? Math.round((plannedMin / Math.max(actualMin, 1)) * 100) : 0;

        return {
          staffId: asgn.staff_user_id,
          name: profile?.full_name || "—",
          initials: profile?.avatar_initials || "?",
          plannedMin,
          actualMin,
          breakMin,
          transitionMin,
          shiftTotalMin,
          availableMin,
          utilizationPct: Math.min(utilizationPct, 100),
          efficiency: Math.min(efficiency, 200),
          completedCount,
          totalTasks: staffTasks.length,
        };
      });

      const totalPlanned = staffUtilization.reduce((s, u) => s + u.plannedMin, 0);
      const totalActual = staffUtilization.reduce((s, u) => s + u.actualMin, 0);
      const avgEfficiency = totalPlanned > 0 ? Math.round((totalPlanned / Math.max(totalActual, 1)) * 100) : 0;

      return { staffUtilization, totalPlanned, totalActual, avgEfficiency };
    },
  });
}

/* ─── Main Component ─── */
const ReportsPanel = () => {
  const [tab, setTab] = useState<ReportTab>("quality");
  const quality = useQualityReport();
  const utilization = useUtilizationReport();

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        <button
          onClick={() => setTab("quality")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-semibold transition-colors ${tab === "quality" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          <Star size={15} /> דוח איכות
        </button>
        <button
          onClick={() => setTab("utilization")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-semibold transition-colors ${tab === "utilization" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          <Clock size={15} /> דוח ניצולת
        </button>
      </div>

      {tab === "quality" && <QualityReport data={quality.data} isLoading={quality.isLoading} />}
      {tab === "utilization" && <UtilizationReport data={utilization.data} isLoading={utilization.isLoading} />}
    </div>
  );
};

/* ─── Quality Report View ─── */
function QualityReport({ data, isLoading }: { data: ReturnType<typeof useQualityReport>["data"]; isLoading: boolean }) {
  if (isLoading) return <div className="kpi-card text-center py-12 text-muted-foreground">טוען נתוני איכות...</div>;
  if (!data || !data.inspections.length) {
    return (
      <div className="kpi-card text-center py-12">
        <Star size={36} className="mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">אין ביקורות איכות עדיין</p>
      </div>
    );
  }

  const scoreColor = (s: number) => s >= 80 ? "text-success" : s >= 60 ? "text-warning" : "text-destructive";

  return (
    <div className="space-y-4">
      {/* Overall KPI */}
      <div className="kpi-card text-center">
        <Star size={24} className={`mx-auto mb-1 ${scoreColor(data.avgScore)}`} />
        <p className={`text-4xl font-bold mono ${scoreColor(data.avgScore)}`}>{data.avgScore}</p>
        <p className="text-xs text-muted-foreground">ממוצע ציון איכות · {data.inspections.length} ביקורות</p>
      </div>

      {/* By Space Type */}
      {data.bySpaceType.length > 0 && (
        <div className="task-card">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm"><Layers size={15} /> לפי סוג חלל</h3>
          <div className="space-y-2">
            {data.bySpaceType.map((s) => (
              <div key={s.type} className="flex items-center gap-3">
                <span className="text-xs w-24 text-right">{s.label}</span>
                <Progress value={s.avg} className="flex-1 h-2.5 [&>div]:bg-info" />
                <span className={`mono text-sm font-semibold w-12 text-left ${scoreColor(s.avg)}`}>{s.avg}</span>
                <span className="text-[10px] text-muted-foreground w-8">({s.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By Location chart */}
      {data.byLocation.length > 0 && (
        <div className="task-card">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm"><Building2 size={15} /> לפי מיקום</h3>
          <div className="h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byLocation.slice(0, 10)} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                  {data.byLocation.slice(0, 10).map((entry, i) => (
                    <Cell key={i} fill={entry.avg >= 80 ? "hsl(var(--success))" : entry.avg >= 60 ? "hsl(var(--warning))" : "hsl(var(--destructive))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* By Staff table */}
      {data.byStaff.length > 0 && (
        <div className="task-card">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm"><Users size={15} /> לפי עובד</h3>
          <div className="space-y-2">
            {data.byStaff.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{s.initials}</div>
                <span className="text-sm font-medium flex-1">{s.name}</span>
                <Progress value={s.avg} className="w-24 h-2.5 [&>div]:bg-info" />
                <span className={`mono text-sm font-semibold w-10 text-left ${scoreColor(s.avg)}`}>{s.avg}</span>
                <span className="text-[10px] text-muted-foreground">({s.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Utilization Report View ─── */
function UtilizationReport({ data, isLoading }: { data: ReturnType<typeof useUtilizationReport>["data"]; isLoading: boolean }) {
  if (isLoading) return <div className="kpi-card text-center py-12 text-muted-foreground">טוען נתוני ניצולת...</div>;
  if (!data || !data.staffUtilization.length) {
    return (
      <div className="kpi-card text-center py-12">
        <Clock size={36} className="mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">אין נתוני שיבוץ להיום</p>
      </div>
    );
  }

  const effColor = (e: number) => e >= 90 ? "text-success" : e >= 70 ? "text-warning" : "text-destructive";

  return (
    <div className="space-y-4">
      {/* Overall KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="kpi-card text-center">
          <Clock size={20} className="mx-auto mb-1 text-info" />
          <p className="text-2xl font-bold mono">{data.totalPlanned}</p>
          <p className="text-[10px] text-muted-foreground">דק׳ מתוכנן</p>
        </div>
        <div className="kpi-card text-center">
          <Clock size={20} className="mx-auto mb-1 text-success" />
          <p className="text-2xl font-bold mono">{data.totalActual}</p>
          <p className="text-[10px] text-muted-foreground">דק׳ בפועל</p>
        </div>
        <div className="kpi-card text-center">
          <BarChart3 size={20} className={`mx-auto mb-1 ${effColor(data.avgEfficiency)}`} />
          <p className={`text-2xl font-bold mono ${effColor(data.avgEfficiency)}`}>{data.avgEfficiency}%</p>
          <p className="text-[10px] text-muted-foreground">יעילות ממוצעת</p>
        </div>
      </div>

      {/* Utilization chart */}
      <div className="task-card">
        <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm"><Users size={15} /> ניצולת לפי עובד</h3>
        <div className="h-56" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.staffUtilization} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="utilizationPct" name="ניצולת %" radius={[4, 4, 0, 0]}>
                {data.staffUtilization.map((entry, i) => (
                  <Cell key={i} fill={entry.utilizationPct >= 80 ? "hsl(var(--success))" : entry.utilizationPct >= 60 ? "hsl(var(--warning))" : "hsl(var(--destructive))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Staff detail table */}
      <div className="task-card">
        <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm"><BarChart3 size={15} /> פירוט זמנים לפי עובד</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right">
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">עובד</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">משמרת</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">מתוכנן</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">בפועל</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">הפסקה</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">מעברים</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">ניצולת</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">יעילות</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">משימות</th>
              </tr>
            </thead>
            <tbody>
              {data.staffUtilization.map((row) => (
                <tr key={row.staffId} className="border-b border-border/50">
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">{row.initials}</div>
                      <span className="font-medium text-xs">{row.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 mono text-xs">{row.shiftTotalMin} דק׳</td>
                  <td className="py-2.5 px-2 mono text-xs">{row.plannedMin} דק׳</td>
                  <td className="py-2.5 px-2 mono text-xs">{row.actualMin} דק׳</td>
                  <td className="py-2.5 px-2 mono text-xs">{row.breakMin} דק׳</td>
                  <td className="py-2.5 px-2 mono text-xs">{row.transitionMin} דק׳</td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-1.5">
                      <Progress value={row.utilizationPct} className="w-14 h-2 [&>div]:bg-info" />
                      <span className="mono text-xs font-semibold">{row.utilizationPct}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2">
                    <span className={`mono text-xs font-semibold ${effColor(row.efficiency)}`}>{row.efficiency}%</span>
                  </td>
                  <td className="py-2.5 px-2 mono text-xs">{row.completedCount}/{row.totalTasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ReportsPanel;
