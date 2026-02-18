import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Zap, Trophy, ArrowRight, MapPin, Clock, X, XCircle, ChevronLeft } from "lucide-react";
import type { TaskAssignment } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface EndOfDayAnalysisProps {
  assignments: TaskAssignment[];
  onClose: () => void;
}

type DrillDown = "tasks" | "faults" | null;

const EndOfDayAnalysis = ({ assignments, onClose }: EndOfDayAnalysisProps) => {
  const { user } = useAuth();
  const [todayScore, setTodayScore] = useState<number | null>(null);
  const [monthAvg, setMonthAvg] = useState<number | null>(null);
  const [drillDown, setDrillDown] = useState<DrillDown>(null);

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
  const notCompleted = assignments.filter((a) => a.status !== "completed");
  const overdue = assignments.filter(
    (a) => a.status === "completed" && a.elapsedMinutes !== undefined && a.elapsedMinutes > a.task.estimatedMinutes * 1.15
  );
  const breakFixTasks = assignments.filter((a) => a.isBreakFix);

  const scoreColor = (v: number | null) =>
    v === null ? "text-muted-foreground" : v >= 85 ? "text-success" : v >= 65 ? "text-warning" : "text-destructive";

  const scoreBg = (v: number | null) =>
    v === null ? "bg-muted/40" : v >= 85 ? "bg-success/10" : v >= 65 ? "bg-warning/10" : "bg-destructive/10";

  if (drillDown) {
    return (
      <DrillDownView
        type={drillDown}
        completed={completed}
        notCompleted={notCompleted}
        breakFixTasks={breakFixTasks}
        onBack={() => setDrillDown(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs opacity-75 uppercase tracking-wider">סיכום יום</p>
          <h1 className="text-lg font-bold">{user?.user_metadata?.full_name || "עובד"}</h1>
        </div>
        <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-foreground/20 text-primary-foreground text-sm font-medium hover:bg-primary-foreground/30 transition-colors">
          <ChevronLeft size={16} />
          חזרה
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {/* Daily Score */}
          <div className={`rounded-2xl p-5 text-center ${scoreBg(todayScore)} border border-border animate-scale-in`} style={{ animationDelay: "0ms" }}>
            <Trophy size={28} className={`mx-auto mb-2 ${scoreColor(todayScore)}`} />
            <p className={`text-4xl font-black mono ${scoreColor(todayScore)}`}>
              {todayScore ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">ציון יומי</p>
          </div>

          {/* Tasks completed — clickable */}
          <button
            onClick={() => setDrillDown("tasks")}
            className={`rounded-2xl p-5 text-center bg-success/10 border border-border hover:ring-2 hover:ring-success/30 transition-all text-right animate-scale-in`}
            style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
          >
            <CheckCircle2 size={28} className="mx-auto mb-2 text-success" />
            <p className="text-4xl font-black mono text-success">
              {completed.length}<span className="text-lg text-muted-foreground">/{assignments.length}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">משימות שבוצעו ›</p>
          </button>

          {/* Immediate faults — clickable */}
          <button
            onClick={() => setDrillDown("faults")}
            className="rounded-2xl p-5 text-center bg-warning/10 border border-border hover:ring-2 hover:ring-warning/30 transition-all animate-scale-in"
            style={{ animationDelay: "160ms", animationFillMode: "backwards" }}
          >
            <Zap size={28} className="mx-auto mb-2 text-warning" />
            <p className="text-4xl font-black mono text-warning">
              {breakFixTasks.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">תקלות מיידיות ›</p>
          </button>

          {/* SLA deviations */}
          <div className={`rounded-2xl p-5 text-center ${overdue.length > 0 ? "bg-destructive/10" : "bg-success/10"} border border-border animate-scale-in`} style={{ animationDelay: "240ms", animationFillMode: "backwards" }}>
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

/* ── Drill-down detail view ── */

interface DrillDownViewProps {
  type: "tasks" | "faults";
  completed: TaskAssignment[];
  notCompleted: TaskAssignment[];
  breakFixTasks: TaskAssignment[];
  onBack: () => void;
}

const DrillDownView = ({ type, completed, notCompleted, breakFixTasks, onBack }: DrillDownViewProps) => {
  const title = type === "tasks" ? "פירוט משימות" : "תקלות מיידיות";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">{title}</h1>
        <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-foreground/20 text-primary-foreground text-sm font-medium hover:bg-primary-foreground/30 transition-colors">
          <ChevronLeft size={16} />
          חזרה
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 animate-fade-in">
        {type === "tasks" ? (
          <>
            {completed.length > 0 && (
              <Section label="בוצעו" count={completed.length} color="text-success">
                {completed.map((a) => <TaskRow key={a.id} a={a} />)}
              </Section>
            )}
            {notCompleted.length > 0 && (
              <Section label="לא בוצעו" count={notCompleted.length} color="text-destructive">
                {notCompleted.map((a) => <TaskRow key={a.id} a={a} />)}
              </Section>
            )}
            {completed.length === 0 && notCompleted.length === 0 && (
              <p className="text-center text-muted-foreground py-8">אין משימות להצגה</p>
            )}
          </>
        ) : (
          <>
            {breakFixTasks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">לא טופלו תקלות מיידיות היום</p>
            ) : (
              breakFixTasks.map((a) => <FaultRow key={a.id} a={a} />)
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ── Section header ── */
const Section = ({ label, count, color, children }: { label: string; count: number; color: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 mb-1">
      <span className={`text-sm font-bold ${color}`}>{label}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </div>
    {children}
  </div>
);

/* ── Task row ── */
const TaskRow = ({ a }: { a: TaskAssignment }) => {
  const done = a.status === "completed";
  const isOvertime = a.elapsedMinutes !== undefined && a.elapsedMinutes > a.task.estimatedMinutes * 1.15;

  return (
    <div className={`rounded-xl border p-3 ${isOvertime ? "border-destructive/40 bg-destructive/5" : "border-border"}`}>
      <div className="flex items-center gap-2 mb-1">
        {done ? (
          <CheckCircle2 size={16} className="text-success shrink-0" />
        ) : (
          <XCircle size={16} className="text-destructive shrink-0" />
        )}
        <p className="font-semibold text-sm flex-1">{a.task.name}</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin size={11} />
        <span>{a.task.zone.name} · אגף {a.task.zone.wing} · קומה {a.task.zone.floor}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
        {a.startedAt && <span className="mono">התחלה: {a.startedAt}</span>}
        {a.completedAt && <span className="mono text-success">סיום: {a.completedAt}</span>}
        {a.elapsedMinutes !== undefined && (
          <span className={`mono ${isOvertime ? "text-destructive font-medium" : ""}`}>
            <Clock size={11} className="inline mr-0.5" />
            {a.elapsedMinutes}/{a.task.estimatedMinutes} דק׳
          </span>
        )}
      </div>
      {a.issues && a.issues.length > 0 && (
        <div className="mt-1.5 flex gap-1 flex-wrap">
          {a.issues.map((issue, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-destructive/10 text-destructive font-medium">{issue}</span>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Fault row ── */
const FaultRow = ({ a }: { a: TaskAssignment }) => (
  <div className="rounded-xl border border-warning/40 bg-warning/5 p-3">
    <div className="flex items-center gap-2 mb-1">
      <Zap size={16} className="text-warning shrink-0" />
      <p className="font-semibold text-sm flex-1">{a.breakFixDescription || a.task.name}</p>
    </div>
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <MapPin size={11} />
      <span>{a.task.zone.name} · אגף {a.task.zone.wing} · קומה {a.task.zone.floor}</span>
    </div>
    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
      {a.startedAt && <span className="mono">התחלה: {a.startedAt}</span>}
      {a.completedAt && <span className="mono text-success">סיום: {a.completedAt}</span>}
      {a.elapsedMinutes !== undefined && (
        <span className="mono">
          <Clock size={11} className="inline mr-0.5" />
          {a.elapsedMinutes} דק׳
        </span>
      )}
    </div>
    <div className="mt-1.5">
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
        a.status === "completed" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
      }`}>
        {a.status === "completed" ? "טופל" : "לא טופל"}
      </span>
    </div>
  </div>
);

export default EndOfDayAnalysis;
