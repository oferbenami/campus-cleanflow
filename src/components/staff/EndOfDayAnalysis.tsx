import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Zap, Trophy } from "lucide-react";
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

  useEffect(() => {
    if (!user?.id) return;
    const today = new Date().toISOString().split("T")[0];
    const monthStart = today.slice(0, 7) + "-01";
    Promise.all([
      supabase.from("daily_worker_scores").select("total_points").eq("worker_id", user.id).eq("score_date", today).maybeSingle(),
      supabase.from("daily_worker_scores").select("total_points").eq("worker_id", user.id).gte("score_date", monthStart).lte("score_date", today),
    ]).then(([todayRes, monthRes]) => {
      if (todayRes.data) setTodayScore(todayRes.data.total_points);
      if (monthRes.data && monthRes.data.length > 0) {
        const avg = monthRes.data.reduce((s, r) => s + (r.total_points || 0), 0) / monthRes.data.length;
        setMonthAvg(Math.round(avg * 10) / 10);
      }
    });
  }, [user?.id]);

  const completed = assignments.filter((a) => a.status === "completed");
  const overdue = assignments.filter(
    (a) => a.status === "completed" && a.elapsedMinutes !== undefined && a.elapsedMinutes > a.task.estimatedMinutes * 1.15
  );
  const breakFixTasks = assignments.filter((a) => a.isBreakFix);

  const scoreColor = (v: number | null) =>
    v === null ? "text-muted-foreground" : v >= 85 ? "text-success" : v >= 65 ? "text-warning" : "text-destructive";

  const scoreBg = (v: number | null) =>
    v === null ? "bg-muted/40" : v >= 85 ? "bg-success/10" : v >= 65 ? "bg-warning/10" : "bg-destructive/10";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs opacity-75 uppercase tracking-wider">סיכום יום</p>
          <h1 className="text-lg font-bold">{user?.user_metadata?.full_name || "עובד"}</h1>
        </div>
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-primary-foreground/10 text-primary-foreground text-sm font-medium">
          חזרה
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {/* Daily Score */}
          <div className={`rounded-2xl p-5 text-center ${scoreBg(todayScore)} border border-border`}>
            <Trophy size={28} className={`mx-auto mb-2 ${scoreColor(todayScore)}`} />
            <p className={`text-4xl font-black mono ${scoreColor(todayScore)}`}>
              {todayScore ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">ציון יומי</p>
          </div>

          {/* Tasks completed */}
          <div className="rounded-2xl p-5 text-center bg-success/10 border border-border">
            <CheckCircle2 size={28} className="mx-auto mb-2 text-success" />
            <p className="text-4xl font-black mono text-success">
              {completed.length}<span className="text-lg text-muted-foreground">/{assignments.length}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">משימות שבוצעו</p>
          </div>

          {/* Immediate faults */}
          <div className="rounded-2xl p-5 text-center bg-warning/10 border border-border">
            <Zap size={28} className="mx-auto mb-2 text-warning" />
            <p className="text-4xl font-black mono text-warning">
              {breakFixTasks.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">תקלות מיידיות</p>
          </div>

          {/* SLA deviations */}
          <div className={`rounded-2xl p-5 text-center ${overdue.length > 0 ? "bg-destructive/10" : "bg-success/10"} border border-border`}>
            <AlertTriangle size={28} className={`mx-auto mb-2 ${overdue.length > 0 ? "text-destructive" : "text-success"}`} />
            <p className={`text-4xl font-black mono ${overdue.length > 0 ? "text-destructive" : "text-success"}`}>
              {overdue.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">חריגות SLA</p>
          </div>
        </div>
      </div>

      {/* Monthly avg footer */}
      {monthAvg !== null && (
        <div className="px-4 pb-6 text-center">
          <p className="text-xs text-muted-foreground">ממוצע חודשי</p>
          <p className={`text-2xl font-black mono ${scoreColor(monthAvg)}`}>{monthAvg}</p>
        </div>
      )}
    </div>
  );
};

export default EndOfDayAnalysis;
