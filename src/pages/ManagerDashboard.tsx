import { useState, useEffect } from "react";
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
  FileText,
  ChevronLeft,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { mockAssignments, mockStaff, type TaskAssignment } from "@/data/mockData";
import { getPlannedMinutesUpToNow } from "@/data/staffSchedule";
import DrillDownPanel from "@/components/manager/DrillDownPanel";
import ManagerEndOfDay from "@/components/manager/ManagerEndOfDay";

type DrillDown = "staff" | "completed" | "inProgress" | "overdue" | "sla" | null;

const ManagerDashboard = () => {
  const [selectedShift] = useState<"morning" | "evening">("morning");
  const [drillDown, setDrillDown] = useState<DrillDown>(null);
  const [showEndOfDay, setShowEndOfDay] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const activeStaff = mockStaff.filter((s) => s.role === "staff");
  const totalTasks = mockAssignments.length;
  const completedTasks = mockAssignments.filter((a) => a.status === "completed").length;
  const inProgress = mockAssignments.filter((a) => a.status === "in_progress").length;
  const overdueTasks = mockAssignments.filter((a) => a.status === "overdue").length;

  // Progress score
  const { shouldBeCompleted } = getPlannedMinutesUpToNow(mockAssignments, now.getHours(), now.getMinutes());
  const completedMinutes = mockAssignments
    .filter((a) => a.status === "completed")
    .reduce((s, a) => s + (a.elapsedMinutes || a.task.estimatedMinutes), 0);
  const progressScore = shouldBeCompleted > 0
    ? Math.min(Math.round((completedMinutes / shouldBeCompleted) * 100), 100)
    : completedTasks > 0 ? 100 : 0;

  // SLA stats
  const withTime = mockAssignments.filter((a) => a.elapsedMinutes !== undefined);
  const breached = withTime.filter((a) => (a.elapsedMinutes || 0) > a.task.estimatedMinutes * 1.15).length;
  const slaRate = withTime.length > 0 ? Math.round(((withTime.length - breached) / withTime.length) * 100) : 100;

  const staffGroups = activeStaff.map((staff) => ({
    staff,
    assignments: mockAssignments.filter((a) => a.staff.id === staff.id),
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">CleanFlow</h1>
            <p className="text-sm opacity-75">לוח בקרה תפעולי</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-left">
              <p className="text-xs opacity-75">היום</p>
              <p className="text-sm font-semibold mono">15 בפבר׳ 2026</p>
            </div>
            <div className="flex gap-1">
              <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedShift === 'morning' ? 'bg-accent text-accent-foreground' : 'bg-primary-foreground/10 text-primary-foreground'}`}>
                בוקר
              </button>
              <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedShift === 'evening' ? 'bg-accent text-accent-foreground' : 'bg-primary-foreground/10 text-primary-foreground'}`}>
                ערב
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* KPI Cards - clickable */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <button onClick={() => setDrillDown("staff")} className="kpi-card text-right hover:ring-2 hover:ring-info/30 transition-all cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-info/15 flex items-center justify-center">
                <Users size={20} className="text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeStaff.length}</p>
                <p className="text-xs text-muted-foreground">עובדים פעילים</p>
              </div>
            </div>
            <p className="text-[10px] text-info flex items-center gap-1"><ChevronLeft size={10} /> לחץ לפירוט</p>
          </button>

          <button onClick={() => setDrillDown("completed")} className="kpi-card text-right hover:ring-2 hover:ring-success/30 transition-all cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-success/15 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedTasks}/{totalTasks}</p>
                <p className="text-xs text-muted-foreground">משימות הושלמו</p>
              </div>
            </div>
            <p className="text-[10px] text-success flex items-center gap-1"><ChevronLeft size={10} /> לחץ לפירוט</p>
          </button>

          <button onClick={() => setDrillDown("inProgress")} className="kpi-card text-right hover:ring-2 hover:ring-accent/30 transition-all cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
                <Activity size={20} className="text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgress}</p>
                <p className="text-xs text-muted-foreground">בביצוע</p>
              </div>
            </div>
            <p className="text-[10px] text-accent flex items-center gap-1"><ChevronLeft size={10} /> לחץ לפירוט</p>
          </button>

          <button onClick={() => setDrillDown("overdue")} className="kpi-card text-right hover:ring-2 hover:ring-destructive/30 transition-all cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/15 flex items-center justify-center">
                <AlertTriangle size={20} className="text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueTasks}</p>
                <p className="text-xs text-muted-foreground">חריגות</p>
              </div>
            </div>
            <p className="text-[10px] text-destructive flex items-center gap-1"><ChevronLeft size={10} /> לחץ לפירוט</p>
          </button>
        </div>

        {/* Progress Score + SLA row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Progress Score */}
          <div className="kpi-card">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={18} className={progressScore >= 90 ? "text-success" : progressScore >= 70 ? "text-warning" : "text-destructive"} />
              <h3 className="font-semibold">ציון התקדמות</h3>
              <span className="text-[10px] text-muted-foreground mono mr-auto">
                עדכון: {now.getHours().toString().padStart(2, "0")}:{now.getMinutes().toString().padStart(2, "0")}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <p className={`text-4xl font-bold mono ${progressScore >= 90 ? "text-success" : progressScore >= 70 ? "text-warning" : "text-destructive"}`}>
                {progressScore}%
              </p>
              <Progress
                value={progressScore}
                className={`flex-1 h-3 ${progressScore >= 90 ? "[&>div]:bg-success" : progressScore >= 70 ? "[&>div]:bg-warning" : "[&>div]:bg-destructive"}`}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">ביצוע בפועל ביחס למשימות שהיו צריכות להסתיים עד עכשיו</p>
          </div>

          {/* SLA Summary */}
          <button onClick={() => setDrillDown("sla")} className="kpi-card text-right hover:ring-2 hover:ring-info/30 transition-all cursor-pointer">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={18} className="text-info" />
              <h3 className="font-semibold">דוח SLA</h3>
            </div>
            <div className="flex items-center gap-4">
              <p className={`text-4xl font-bold mono ${slaRate >= 90 ? "text-success" : slaRate >= 70 ? "text-warning" : "text-destructive"}`}>
                {slaRate}%
              </p>
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>עמידה ב-SLA</span>
                  <span className="mono">{breached} חריגות</span>
                </div>
                <Progress
                  value={slaRate}
                  className={`h-3 ${slaRate >= 90 ? "[&>div]:bg-success" : slaRate >= 70 ? "[&>div]:bg-warning" : "[&>div]:bg-destructive"}`}
                />
              </div>
            </div>
            <p className="text-[10px] text-info flex items-center gap-1 mt-2"><ChevronLeft size={10} /> לחץ לדוח מפורט</p>
          </button>
        </div>

        {/* Real-time tracking grid */}
        <div className="task-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BarChart3 size={20} />
              מעקב עובדים בזמן אמת
            </h2>
            <span className="status-badge status-active">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse-slow" />
              חי
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

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{staff.name}</p>
                        {staff.status === "break" && (
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
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin size={12} />
                          <span>{currentTask.task.zone.name}</span>
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

                  <div className="flex gap-1.5 mt-3 mr-14">
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
            <h3 className="font-semibold">אחוז השלמה היום</h3>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-4xl font-bold mono">
              {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
            </p>
            <Progress value={(completedTasks / totalTasks) * 100} className="flex-1 h-3 [&>div]:bg-success" />
          </div>
        </div>
      </div>

      {/* End of Day button */}
      <div className="max-w-7xl mx-auto px-6 pb-6">
        <button
          onClick={() => setShowEndOfDay(true)}
          className="btn-action-primary w-full flex items-center justify-center gap-3"
        >
          <BarChart3 size={20} />
          ניתוח סוף יום
        </button>
      </div>

      {/* Drill-down modal */}
      {drillDown && (
        <DrillDownPanel
          type={drillDown}
          assignments={mockAssignments}
          staff={mockStaff}
          onClose={() => setDrillDown(null)}
        />
      )}

      {/* End of Day analysis */}
      {showEndOfDay && (
        <ManagerEndOfDay onClose={() => setShowEndOfDay(false)} />
      )}
    </div>
  );
};

export default ManagerDashboard;
