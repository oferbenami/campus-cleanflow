import { useState } from "react";
import { CheckCircle2, AlertTriangle, Zap, Trophy, MapPin, Clock, XCircle, ChevronLeft, Wrench } from "lucide-react";
import type { AssignedTaskRow } from "@/hooks/useStaffAssignment";
import { useAuth } from "@/hooks/useAuth";

interface EndOfDayAnalysisProps {
  tasks: AssignedTaskRow[];
  onClose: () => void;
  resolvedIncidentCount?: number;
}

type DrillDown = "tasks" | "faults" | null;

const EndOfDayAnalysis = ({ tasks, onClose, resolvedIncidentCount = 0 }: EndOfDayAnalysisProps) => {
  const { user } = useAuth();
  const [drillDown, setDrillDown] = useState<DrillDown>(null);

  const completed = tasks.filter((t) => t.status === "completed");
  const notCompleted = tasks.filter((t) => t.status !== "completed");
  const overdue = completed.filter(
    (t) => t.variance_percent !== null && t.variance_percent > 15
  );

  if (drillDown) {
    return (
      <DrillDownView
        type={drillDown}
        completed={completed}
        notCompleted={notCompleted}
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
        <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-foreground/20 text-primary-foreground text-sm font-medium">
          <ChevronLeft size={16} />
          חזרה
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          <button
            onClick={() => setDrillDown("tasks")}
            className="rounded-2xl p-5 text-center bg-success/10 border border-border hover:ring-2 hover:ring-success/30 transition-all animate-scale-in"
          >
            <CheckCircle2 size={28} className="mx-auto mb-2 text-success" />
            <p className="text-4xl font-black mono text-success">
              {completed.length}<span className="text-lg text-muted-foreground">/{tasks.length}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">משימות שבוצעו ›</p>
          </button>

          <div className={`rounded-2xl p-5 text-center ${overdue.length > 0 ? "bg-destructive/10" : "bg-success/10"} border border-border animate-scale-in`}>
            <AlertTriangle size={28} className={`mx-auto mb-2 ${overdue.length > 0 ? "text-destructive" : "text-success"}`} />
            <p className={`text-4xl font-black mono ${overdue.length > 0 ? "text-destructive" : "text-success"}`}>
              {overdue.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">חריגות SLA</p>
          </div>

          {/* Incident count */}
          <div className="rounded-2xl p-5 text-center bg-warning/10 border border-border animate-scale-in col-span-2">
            <Wrench size={28} className="mx-auto mb-2 text-warning" />
            <p className="text-4xl font-black mono text-warning">{resolvedIncidentCount}</p>
            <p className="text-xs text-muted-foreground mt-1">תקלות שטופלו</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Drill-down detail view ── */
interface DrillDownViewProps {
  type: "tasks" | "faults";
  completed: AssignedTaskRow[];
  notCompleted: AssignedTaskRow[];
  onBack: () => void;
}

const DrillDownView = ({ type, completed, notCompleted, onBack }: DrillDownViewProps) => {
  const title = type === "tasks" ? "פירוט משימות" : "תקלות מיידיות";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">{title}</h1>
        <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-foreground/20 text-primary-foreground text-sm font-medium">
          <ChevronLeft size={16} />
          חזרה
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 animate-fade-in">
        {completed.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-bold text-success">בוצעו ({completed.length})</span>
            {completed.map((t) => <TaskRow key={t.id} task={t} />)}
          </div>
        )}
        {notCompleted.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-bold text-destructive">לא בוצעו ({notCompleted.length})</span>
            {notCompleted.map((t) => <TaskRow key={t.id} task={t} />)}
          </div>
        )}
      </div>
    </div>
  );
};

const TaskRow = ({ task: t }: { task: AssignedTaskRow }) => {
  const done = t.status === "completed";
  const isOvertime = t.variance_percent !== null && t.variance_percent > 15;

  return (
    <div className={`rounded-xl border p-3 ${isOvertime ? "border-destructive/40 bg-destructive/5" : "border-border"}`}>
      <div className="flex items-center gap-2 mb-1">
        {done ? <CheckCircle2 size={16} className="text-success shrink-0" /> : <XCircle size={16} className="text-destructive shrink-0" />}
        <p className="font-semibold text-sm flex-1">{t.task_name}</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin size={11} />
        <span>{t.location_name}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
        {t.actual_minutes !== null && (
          <span className={`mono ${isOvertime ? "text-destructive font-medium" : ""}`}>
            <Clock size={11} className="inline mr-0.5" />
            {t.actual_minutes}/{t.standard_minutes} דק׳
          </span>
        )}
      </div>
    </div>
  );
};

export default EndOfDayAnalysis;
