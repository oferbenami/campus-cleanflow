import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Clock, TrendingUp, BarChart3, Zap, Trophy, Star, Shield } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { TaskAssignment } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface EndOfDayAnalysisProps {
  assignments: TaskAssignment[];
  onClose: () => void;
}

const EndOfDayAnalysis = ({ assignments, onClose }: EndOfDayAnalysisProps) => {
  const { user } = useAuth();
  const [todayScore, setTodayScore] = useState<number | null>(null);
  const [monthAvg, setMonthAvg] = useState<number | null>(null);
  const [scoreBreakdown, setScoreBreakdown] = useState<{ productivity: number; quality: number; discipline: number } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const fetchScores = async () => {
      const today = new Date().toISOString().split("T")[0];
      const monthStart = today.slice(0, 7) + "-01";
      const [todayRes, monthRes] = await Promise.all([
        supabase.from("daily_worker_scores").select("total_points,productivity_points,quality_points,discipline_points").eq("worker_id", user.id).eq("score_date", today).maybeSingle(),
        supabase.from("daily_worker_scores").select("total_points").eq("worker_id", user.id).gte("score_date", monthStart).lte("score_date", today),
      ]);
      if (todayRes.data) {
        setTodayScore(todayRes.data.total_points);
        setScoreBreakdown({ productivity: todayRes.data.productivity_points, quality: todayRes.data.quality_points, discipline: todayRes.data.discipline_points });
      }
      if (monthRes.data && monthRes.data.length > 0) {
        const avg = monthRes.data.reduce((s, r) => s + (r.total_points || 0), 0) / monthRes.data.length;
        setMonthAvg(Math.round(avg * 10) / 10);
      }
    };
    fetchScores();
  }, [user?.id]);
  const completed = assignments.filter((a) => a.status === "completed");
  const overdue = assignments.filter(
    (a) => a.status === "completed" && a.elapsedMinutes !== undefined && a.elapsedMinutes > a.task.estimatedMinutes * 1.15
  );
  const totalPlanned = assignments.reduce((s, a) => s + a.task.estimatedMinutes, 0);
  const totalActual = completed.reduce((s, a) => s + (a.elapsedMinutes || a.task.estimatedMinutes), 0);
  const completionRate = assignments.length > 0 ? Math.round((completed.length / assignments.length) * 100) : 0;
  const efficiency = totalPlanned > 0 ? Math.round((totalPlanned / Math.max(totalActual, 1)) * 100) : 0;

  const breakFixTasks = assignments.filter((a) => a.isBreakFix);
  const breakFixMinutes = breakFixTasks.reduce((s, a) => s + (a.elapsedMinutes || 0), 0);

  const chartData = assignments.map((a) => ({
    name: a.task.zone.name.split(" ").slice(0, 2).join(" "),
    מתוכנן: a.task.estimatedMinutes,
    בפועל: a.elapsedMinutes || 0,
    overdue: a.elapsedMinutes !== undefined && a.elapsedMinutes > a.task.estimatedMinutes * 1.15,
  }));

  const tableData = assignments.map((a) => ({
    zone: a.task.zone.name,
    planned: a.task.estimatedMinutes,
    actual: a.elapsedMinutes ?? "-",
    status: a.status,
    startedAt: a.startedAt || "-",
    completedAt: a.completedAt || "-",
    isBreakFix: a.isBreakFix || false,
    diff: a.elapsedMinutes !== undefined ? a.elapsedMinutes - a.task.estimatedMinutes : null,
  }));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs opacity-75 uppercase tracking-wider">ניתוח סוף יום</p>
          <h1 className="text-lg font-bold">שרה כהן</h1>
        </div>
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-primary-foreground/10 text-primary-foreground text-sm font-medium">
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

        {/* Break-fix stats */}
        {breakFixTasks.length > 0 && (
          <div className="kpi-card">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-warning" />
              <h3 className="text-sm font-semibold">תקלות מיידיות</h3>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-2xl font-bold mono">{breakFixTasks.length}</p>
                <p className="text-xs text-muted-foreground">תקלות</p>
              </div>
              <div>
                <p className="text-2xl font-bold mono text-warning">{breakFixMinutes}</p>
                <p className="text-xs text-muted-foreground">דק׳ מסדר היום</p>
              </div>
            </div>
          </div>
        )}

        {/* Daily & Monthly Score */}
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={16} className="text-accent" />
            <h3 className="text-sm font-semibold">ניקוד תמריצים</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className={`text-3xl font-black mono ${todayScore !== null ? (todayScore >= 85 ? 'text-success' : todayScore >= 65 ? 'text-warning' : 'text-destructive') : 'text-muted-foreground'}`}>
                {todayScore ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">ניקוד היום</p>
            </div>
            <div className="text-center">
              <p className={`text-3xl font-black mono ${monthAvg !== null ? (monthAvg >= 85 ? 'text-success' : monthAvg >= 65 ? 'text-warning' : 'text-destructive') : 'text-muted-foreground'}`}>
                {monthAvg ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">ממוצע חודשי</p>
            </div>
          </div>
          {scoreBreakdown && (
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              <ScoreRow icon={Zap} label="פרודוקטיביות" points={scoreBreakdown.productivity} max={50} color="bg-blue-500" />
              <ScoreRow icon={Star} label="איכות" points={scoreBreakdown.quality} max={30} color="bg-amber-500" />
              <ScoreRow icon={Shield} label="משמעת" points={scoreBreakdown.discipline} max={20} color="bg-emerald-500" />
            </div>
          )}
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
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="מתוכנן" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="בפועל" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.overdue ? "hsl(var(--destructive))" : "hsl(var(--success))"} />
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
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">סוג</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">התחלה</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">סיום</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">משך (דק׳)</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">הפרש</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 px-2 text-xs font-medium truncate max-w-[100px]">
                    {row.zone}
                    {row.isBreakFix && <span className="text-warning mr-1">⚡</span>}
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {row.isBreakFix ? (
                      <span className="status-badge bg-warning/15 text-warning text-[10px]">תקלה</span>
                    ) : (
                      <span className="text-muted-foreground">רגיל</span>
                    )}
                  </td>
                  <td className="py-2 px-2 mono text-xs">{row.startedAt}</td>
                  <td className="py-2 px-2 mono text-xs">{row.completedAt}</td>
                  <td className="py-2 px-2 mono text-xs">{row.actual === "-" ? "-" : `${row.actual}`}</td>
                  <td className={`py-2 px-2 mono text-xs ${row.diff === null ? "" : row.diff > 0 ? "text-destructive" : "text-success"}`}>
                    {row.diff === null ? "-" : row.diff > 0 ? `+${row.diff}` : row.diff}
                  </td>
                  <td className="py-2 px-2">
                    <span className={`status-badge text-[10px] ${
                      row.status === "completed" ? "status-active" :
                      row.status === "overdue" ? "status-overdue" :
                      row.status === "in_progress" ? "bg-info/15 text-info" : "status-pending"
                    }`}>
                      {row.status === "completed" ? "הושלם" : row.status === "overdue" ? "חריגה" : row.status === "in_progress" ? "בביצוע" : "ממתין"}
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

const ScoreRow = ({ icon: Icon, label, points, max, color }: {
  icon: React.ElementType; label: string; points: number; max: number; color: string;
}) => {
  const pct = Math.round((points / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-muted-foreground shrink-0" />
      <span className="text-[11px] w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-bold mono w-10 text-left">{points}/{max}</span>
    </div>
  );
};

export default EndOfDayAnalysis;
