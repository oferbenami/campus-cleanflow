import { useState, useCallback } from "react";
import {
  Users,
  Clock,
  AlertTriangle,
  Activity,
  Coffee,
  MapPin,
  BarChart3,
  GripVertical,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { TaskAssignment, StaffMember } from "@/data/mockData";
import { toast } from "sonner";

interface StaffTrackingGridProps {
  assignments: TaskAssignment[];
  staff: StaffMember[];
  onReassign: (assignmentId: string, newStaffId: string) => void;
}

const StaffTrackingGrid = ({ assignments, staff, onReassign }: StaffTrackingGridProps) => {
  const [dragOverStaffId, setDragOverStaffId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const activeStaff = staff.filter((s) => s.role === "staff");

  const staffGroups = activeStaff.map((s) => ({
    staff: s,
    assignments: assignments.filter((a) => a.staff.id === s.id),
  }));

  const handleDragStart = useCallback((e: React.DragEvent, assignment: TaskAssignment) => {
    // Only allow dragging pending tasks
    if (assignment.status !== "pending") {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", assignment.id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(assignment.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, staffId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStaffId(staffId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverStaffId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetStaffId: string) => {
    e.preventDefault();
    setDragOverStaffId(null);
    setDraggingId(null);

    const assignmentId = e.dataTransfer.getData("text/plain");
    if (!assignmentId) return;

    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    // Skip if same worker
    if (assignment.staff.id === targetStaffId) return;

    const previousStaffId = assignment.staff.id;
    const previousStaffName = assignment.staff.name;
    const targetStaff = staff.find((s) => s.id === targetStaffId);
    onReassign(assignmentId, targetStaffId);

    toast.success(`משימה הועברה ל${targetStaff?.name}`, {
      description: assignment.task.zone.name,
      action: {
        label: "בטל",
        onClick: () => {
          onReassign(assignmentId, previousStaffId);
          toast.info(`המשימה הוחזרה ל${previousStaffName}`);
        },
      },
    });
  }, [assignments, staff, onReassign]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverStaffId(null);
  }, []);

  return (
    <div className="task-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 size={20} />
          מעקב עובדים בזמן אמת
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <GripVertical size={12} />
            גרור משימות ממתינות לאיזון
          </span>
          <span className="status-badge status-active">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse-slow" />
            חי
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {staffGroups.map(({ staff: worker, assignments: workerAssignments }) => {
          const staffCompleted = workerAssignments.filter((a) => a.status === "completed").length;
          const staffTotal = workerAssignments.length;
          const overallProgress = staffTotal > 0 ? (staffCompleted / staffTotal) * 100 : 0;
          const currentTask = workerAssignments.find((a) => a.status === "in_progress");
          const hasOverdue = workerAssignments.some((a) => a.status === "overdue");
          const isDropTarget = dragOverStaffId === worker.id;

          return (
            <div
              key={worker.id}
              onDragOver={(e) => handleDragOver(e, worker.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, worker.id)}
              className={`rounded-xl border p-4 transition-all ${
                hasOverdue ? "grid-row-overdue" : "border-border"
              } ${isDropTarget ? "ring-2 ring-accent bg-accent/5 border-accent" : ""}`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    worker.status === "active"
                      ? "bg-primary text-primary-foreground"
                      : worker.status === "break"
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {worker.avatar}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{worker.name}</p>
                    {worker.status === "break" && (
                      <span className="status-badge status-pending">
                        <Coffee size={10} />
                        הפסקה
                      </span>
                    )}
                    {hasOverdue && (
                      <span className="status-badge status-overdue">
                        <AlertTriangle size={10} />
                        חריגת SLA
                      </span>
                    )}
                  </div>

                  {currentTask ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <MapPin size={12} />
                      <span>{currentTask.task.zone.name}</span>
                      <span>·</span>
                      {currentTask.startedAt && (
                        <span className="mono">התחלה: {currentTask.startedAt}</span>
                      )}
                      <span>·</span>
                      <Clock size={12} />
                      <span className="mono">
                        {currentTask.elapsedMinutes} דק׳ / {currentTask.task.estimatedMinutes} דק׳
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {staffCompleted === staffTotal ? "כל המשימות הושלמו" : "ממתין למשימה הבאה"}
                    </p>
                  )}
                </div>

                <div className="w-32 text-left">
                  <p className="text-xs text-muted-foreground mb-1 mono">
                    {staffCompleted}/{staffTotal} משימות
                  </p>
                  <Progress value={overallProgress} className="h-2" />
                </div>
              </div>

              <div className="flex gap-1.5 mt-3 mr-14 flex-wrap">
                {workerAssignments.map((a) => {
                  const isPending = a.status === "pending";
                  const isDragging = draggingId === a.id;

                  return (
                    <div
                      key={a.id}
                      draggable={isPending}
                      onDragStart={(e) => handleDragStart(e, a)}
                      onDragEnd={handleDragEnd}
                      className={`px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 ${
                        a.status === "completed"
                          ? "bg-success/15 text-success"
                          : a.status === "in_progress"
                          ? "bg-info/15 text-info"
                          : a.status === "overdue"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-muted text-muted-foreground"
                      } ${isPending ? "cursor-grab hover:ring-1 hover:ring-accent/50 active:cursor-grabbing" : ""} ${
                        isDragging ? "opacity-40" : ""
                      }`}
                      title={`${a.task.name}${isPending ? " — גרור להעברה" : ""}`}
                    >
                      {isPending && <GripVertical size={10} className="shrink-0 opacity-50" />}
                      {a.task.zone.name.split(" ").slice(0, 2).join(" ")}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StaffTrackingGrid;
