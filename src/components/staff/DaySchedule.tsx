import { CheckCircle2, Clock, Play, AlertTriangle, MapPin, Zap, Image } from "lucide-react";
import type { TaskAssignment } from "@/data/mockData";
import { scheduledTimes } from "@/data/staffSchedule";

interface DayScheduleProps {
  assignments: TaskAssignment[];
  currentIndex: number;
  onClose: () => void;
}

const statusConfig: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
  completed: { icon: <CheckCircle2 size={16} />, label: "הושלם", className: "text-success bg-success/10" },
  in_progress: { icon: <Play size={16} />, label: "בביצוע", className: "text-info bg-info/10" },
  overdue: { icon: <AlertTriangle size={16} />, label: "חריגה", className: "text-destructive bg-destructive/10" },
  pending: { icon: <Clock size={16} />, label: "ממתין", className: "text-muted-foreground bg-muted" },
};

const DaySchedule = ({ assignments, currentIndex, onClose }: DayScheduleProps) => {
  const totalMinutes = assignments.reduce((sum, a) => sum + a.task.estimatedMinutes, 0);
  const completedMinutes = assignments
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + (a.elapsedMinutes || a.task.estimatedMinutes), 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs opacity-75 uppercase tracking-wider">סדר יום</p>
          <h1 className="text-lg font-bold">שרה כהן</h1>
        </div>
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-primary-foreground/10 text-primary-foreground text-sm font-medium">
          חזרה
        </button>
      </header>

      <div className="px-4 py-3">
        <div className="task-card mb-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">סה״כ מתוכנן</p>
            <p className="mono text-sm">{completedMinutes} / {totalMinutes} דק׳</p>
          </div>
        </div>

        <div className="space-y-2">
          {assignments.map((a, i) => {
            const sched = scheduledTimes[a.id];
            const config = statusConfig[a.status] || statusConfig.pending;
            const isCurrent = i === currentIndex;

            return (
              <div key={a.id} className={`task-card flex items-start gap-3 ${isCurrent ? "ring-2 ring-accent" : ""}`}>
                <div className="flex flex-col items-center pt-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.className}`}>
                    {a.isBreakFix ? <Zap size={16} /> : config.icon}
                  </div>
                  {i < assignments.length - 1 && <div className="w-0.5 h-6 bg-border mt-1" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{a.task.zone.name}</p>
                      {a.isBreakFix && (
                        <span className="status-badge bg-warning/15 text-warning text-[10px]">תקלה מיידית</span>
                      )}
                    </div>
                    {sched && (
                      <span className="mono text-xs text-muted-foreground">{sched.plannedStart} – {sched.plannedEnd}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {a.isBreakFix && a.breakFixDescription ? a.breakFixDescription : a.task.name}
                  </p>
                  {a.isBreakFix && a.breakFixImageUrl && (
                    <img src={a.breakFixImageUrl} alt="תמונת תקלה" className="w-full h-24 object-cover rounded-lg border border-border mb-2" />
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><MapPin size={11} /> אגף {a.task.zone.wing}</span>
                    <span className="mono">{a.task.estimatedMinutes} דק׳</span>
                    {a.startedAt && <span className="mono">התחלה: {a.startedAt}</span>}
                    {a.completedAt && <span className="mono text-success">סיום: {a.completedAt}</span>}
                    {a.elapsedMinutes !== undefined && a.status === "completed" && (
                      <span className={`mono ${a.elapsedMinutes > a.task.estimatedMinutes * 1.15 ? "text-destructive" : "text-success"}`}>
                        בפועל: {a.elapsedMinutes} דק׳
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DaySchedule;
