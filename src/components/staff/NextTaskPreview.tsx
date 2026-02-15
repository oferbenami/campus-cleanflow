import { MapPin, Clock, ArrowLeft } from "lucide-react";
import type { TaskAssignment } from "@/data/mockData";
import { scheduledTimes } from "@/data/staffSchedule";

interface NextTaskPreviewProps {
  assignment: TaskAssignment;
}

const NextTaskPreview = ({ assignment }: NextTaskPreviewProps) => {
  const sched = scheduledTimes[assignment.id];

  return (
    <div className="task-card border-dashed opacity-75">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <ArrowLeft size={12} />
          המשימה הבאה
        </p>
        {sched && (
          <span className="text-xs mono text-muted-foreground flex items-center gap-1">
            <Clock size={12} />
            {sched.plannedStart} – {sched.plannedEnd}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="font-semibold text-sm">{assignment.task.zone.name}</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <MapPin size={11} />
            <span>אגף {assignment.task.zone.wing} · קומה {assignment.task.zone.floor}</span>
          </div>
        </div>
        <span className="mono text-xs text-muted-foreground">
          {assignment.task.estimatedMinutes} דק׳
        </span>
      </div>
    </div>
  );
};

export default NextTaskPreview;
