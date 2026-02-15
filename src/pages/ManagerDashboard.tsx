import { useState } from "react";
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Coffee,
  MapPin,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { mockAssignments, mockStaff, type TaskAssignment } from "@/data/mockData";

const ManagerDashboard = () => {
  const [selectedShift] = useState<"morning" | "evening">("morning");

  const activeStaff = mockStaff.filter((s) => s.role === "staff");
  const totalTasks = mockAssignments.length;
  const completedTasks = mockAssignments.filter((a) => a.status === "completed").length;
  const inProgress = mockAssignments.filter((a) => a.status === "in_progress").length;
  const overdueTasks = mockAssignments.filter((a) => a.status === "overdue").length;

  // Group assignments by staff
  const staffGroups = activeStaff.map((staff) => ({
    staff,
    assignments: mockAssignments.filter((a) => a.staff.id === staff.id),
  }));

  const getStatusColor = (a: TaskAssignment) => {
    if (a.status === "overdue") return "text-destructive";
    if (a.status === "completed") return "text-success";
    if (a.status === "in_progress") return "text-info";
    return "text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">CleanFlow</h1>
            <p className="text-sm opacity-75">Campus Operations Dashboard</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs opacity-75">Today</p>
              <p className="text-sm font-semibold mono">Feb 15, 2026</p>
            </div>
            <div className="flex gap-1">
              <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedShift === 'morning' ? 'bg-accent text-accent-foreground' : 'bg-primary-foreground/10 text-primary-foreground'}`}>
                Morning
              </button>
              <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedShift === 'evening' ? 'bg-accent text-accent-foreground' : 'bg-primary-foreground/10 text-primary-foreground'}`}>
                Evening
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="kpi-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-info/15 flex items-center justify-center">
                <Users size={20} className="text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeStaff.length}</p>
                <p className="text-xs text-muted-foreground">Active Staff</p>
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-success/15 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedTasks}/{totalTasks}</p>
                <p className="text-xs text-muted-foreground">Tasks Done</p>
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
                <Activity size={20} className="text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/15 flex items-center justify-center">
                <AlertTriangle size={20} className="text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueTasks}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time tracking grid */}
        <div className="task-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BarChart3 size={20} />
              Real-Time Staff Tracking
            </h2>
            <span className="status-badge status-active">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse-slow" />
              Live
            </span>
          </div>

          <div className="space-y-3">
            {staffGroups.map(({ staff, assignments }) => {
              const staffCompleted = assignments.filter((a) => a.status === "completed").length;
              const staffTotal = assignments.length;
              const overallProgress = staffTotal > 0 ? (staffCompleted / staffTotal) * 100 : 0;
              const currentTask = assignments.find((a) => a.status === "in_progress");
              const hasOverdue = assignments.some((a) => a.status === "overdue");

              return (
                <div
                  key={staff.id}
                  className={`rounded-xl border p-4 transition-all ${
                    hasOverdue ? "grid-row-overdue" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        staff.status === "active"
                          ? "bg-primary text-primary-foreground"
                          : staff.status === "break"
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {staff.avatar}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{staff.name}</p>
                        {staff.status === "break" && (
                          <span className="status-badge status-pending">
                            <Coffee size={10} />
                            Break
                          </span>
                        )}
                        {hasOverdue && (
                          <span className="status-badge status-overdue">
                            <AlertTriangle size={10} />
                            SLA Breach
                          </span>
                        )}
                      </div>

                      {currentTask ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin size={12} />
                          <span>{currentTask.task.zone.name}</span>
                          <span>·</span>
                          <Clock size={12} />
                          <span className="mono">
                            {currentTask.elapsedMinutes}m / {currentTask.task.estimatedMinutes}m
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {staffCompleted === staffTotal ? "All tasks completed" : "Waiting for next task"}
                        </p>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="w-32 text-right">
                      <p className="text-xs text-muted-foreground mb-1 mono">
                        {staffCompleted}/{staffTotal} tasks
                      </p>
                      <Progress
                        value={overallProgress}
                        className="h-2"
                      />
                    </div>
                  </div>

                  {/* Task pills */}
                  <div className="flex gap-1.5 mt-3 ml-14">
                    {assignments.map((a) => (
                      <div
                        key={a.id}
                        className={`px-2 py-1 rounded text-[10px] font-medium ${
                          a.status === "completed"
                            ? "bg-success/15 text-success"
                            : a.status === "in_progress"
                            ? "bg-info/15 text-info"
                            : a.status === "overdue"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-muted text-muted-foreground"
                        }`}
                        title={a.task.name}
                      >
                        {a.task.zone.name.split(" ").slice(0, 2).join(" ")}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Completion Rate */}
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-success" />
            <h3 className="font-semibold">Today's Completion Rate</h3>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-4xl font-bold mono">
              {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
            </p>
            <Progress value={(completedTasks / totalTasks) * 100} className="flex-1 h-3 [&>div]:bg-success" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
