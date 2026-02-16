import { useState, useEffect, useMemo, useCallback } from "react";
import { logActivity } from "@/components/manager/ActivityTimeline";
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Activity,
  TrendingUp,
  BarChart3,
  FileText,
  ChevronLeft,
  PackageOpen,
  Gauge,
  CalendarClock,
  ClipboardList,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { mockAssignments, mockStaff, type TaskAssignment } from "@/data/mockData";
import { getPlannedMinutesUpToNow } from "@/data/staffSchedule";
import DrillDownPanel from "@/components/manager/DrillDownPanel";
import ManagerEndOfDay from "@/components/manager/ManagerEndOfDay";
import TimeStandardsValidation from "@/components/manager/TimeStandardsValidation";
import StaffTrackingGrid from "@/components/manager/StaffTrackingGrid";
import { WorkloadHeatPanel, SlaRiskPanel, VarianceWidget, WorkloadBalancingPanel, computeWorkerBalances } from "@/components/manager/SchedulingWidgets";
import {
  computeWorkloadsFromAssignments,
  computeVariancesFromAssignments,
  computeVarianceSummary,
  getSlaRiskTasks,
} from "@/lib/scheduling-engine";

type DrillDown = "staff" | "completed" | "inProgress" | "overdue" | "sla" | null;
type ManagerTab = "overview" | "workload" | "tracking" | "endOfDay";

const ManagerDashboard = () => {
  const [activeTab, setActiveTab] = useState<ManagerTab>("overview");
  const [selectedShift] = useState<"morning" | "evening">("morning");
  const [drillDown, setDrillDown] = useState<DrillDown>(null);
  const [showEndOfDay, setShowEndOfDay] = useState(false);
  const [now, setNow] = useState(new Date());
  const [assignments, setAssignments] = useState(mockAssignments);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const activeStaff = mockStaff.filter((s) => s.role === "staff");
  const totalTasks = assignments.length;
  const completedTasks = assignments.filter((a) => a.status === "completed").length;
  const inProgress = assignments.filter((a) => a.status === "in_progress").length;
  const overdueTasks = assignments.filter((a) => a.status === "overdue").length;

  const { shouldBeCompleted } = getPlannedMinutesUpToNow(assignments, now.getHours(), now.getMinutes());
  const completedMinutes = assignments
    .filter((a) => a.status === "completed")
    .reduce((s, a) => s + (a.elapsedMinutes || a.task.estimatedMinutes), 0);
  const progressScore = shouldBeCompleted > 0
    ? Math.min(Math.round((completedMinutes / shouldBeCompleted) * 100), 100)
    : completedTasks > 0 ? 100 : 0;

  const withTime = assignments.filter((a) => a.elapsedMinutes !== undefined);
  const breached = withTime.filter((a) => (a.elapsedMinutes || 0) > a.task.estimatedMinutes * 1.15).length;
  const slaRate = withTime.length > 0 ? Math.round(((withTime.length - breached) / withTime.length) * 100) : 100;

  const workloads = useMemo(() => computeWorkloadsFromAssignments(assignments, mockStaff), [assignments]);
  const variances = useMemo(() => computeVariancesFromAssignments(assignments), [assignments]);
  const varianceSummary = useMemo(() => computeVarianceSummary(variances), [variances]);
  const slaRiskTasks = useMemo(() => getSlaRiskTasks(assignments), [assignments]);
  const workerBalances = useMemo(() => computeWorkerBalances(assignments, mockStaff), [assignments]);

  const handleReassign = useCallback((assignmentId: string, newStaffId: string) => {
    const newStaff = mockStaff.find((s) => s.id === newStaffId);
    if (!newStaff) return;
    const oldAssignment = assignments.find((a) => a.id === assignmentId);
    setAssignments((prev) =>
      prev.map((a) => (a.id === assignmentId ? { ...a, staff: newStaff } : a))
    );
    logActivity({
      action_type: "reassignment",
      actor_id: "00000000-0000-0000-0000-000000000099",
      actor_name: "מנהל קמפוס",
      assignment_id: assignmentId,
      target_staff_id: newStaffId,
      target_staff_name: newStaff.name,
      details: `שובץ מחדש מ-${oldAssignment?.staff.name || "?"} ל-${newStaff.name}`,
    });
  }, [assignments]);

  const tabs: { key: ManagerTab; icon: React.ElementType; label: string }[] = [
    { key: "overview", icon: Gauge, label: "סקירה" },
    { key: "workload", icon: CalendarClock, label: "עומסים" },
    { key: "tracking", icon: ClipboardList, label: "מעקב" },
    { key: "endOfDay", icon: BarChart3, label: "סוף יום" },
  ];

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

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {tabs.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {activeTab === "overview" && (
          <div className="animate-slide-up space-y-6">
            {/* KPI Cards */}
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

            {/* Progress Score + SLA */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                  <Progress value={progressScore} className={`flex-1 h-3 ${progressScore >= 90 ? "[&>div]:bg-success" : progressScore >= 70 ? "[&>div]:bg-warning" : "[&>div]:bg-destructive"}`} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">ביצוע בפועל ביחס למשימות שהיו צריכות להסתיים עד עכשיו</p>
              </div>

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
                    <Progress value={slaRate} className={`h-3 ${slaRate >= 90 ? "[&>div]:bg-success" : slaRate >= 70 ? "[&>div]:bg-warning" : "[&>div]:bg-destructive"}`} />
                  </div>
                </div>
                <p className="text-[10px] text-info flex items-center gap-1 mt-2"><ChevronLeft size={10} /> לחץ לדוח מפורט</p>
              </button>
            </div>
          </div>
        )}

        {activeTab === "workload" && (
          <div className="animate-slide-up space-y-6">
            <WorkloadBalancingPanel balances={workerBalances} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <WorkloadHeatPanel workloads={workloads} />
              <SlaRiskPanel riskTasks={slaRiskTasks} />
              <VarianceWidget summary={varianceSummary} />
            </div>
            <TimeStandardsValidation assignments={assignments} />
          </div>
        )}

        {activeTab === "tracking" && (
          <div className="animate-slide-up space-y-6">
            {/* Stock alerts */}
            {(() => {
              const alertMap: Record<string, string[]> = {};
              assignments.forEach((a) => {
                if (a.stockLow && a.stockLow.length > 0) {
                  a.stockLow.forEach((item) => {
                    if (!alertMap[item]) alertMap[item] = [];
                    const loc = `${a.task.zone.name} (${a.staff.name})`;
                    if (!alertMap[item].includes(loc)) alertMap[item].push(loc);
                  });
                }
              });
              const alertItems = Object.entries(alertMap);
              const totalAlerts = alertItems.reduce((s, [, locs]) => s + locs.length, 0);
              if (totalAlerts === 0) return null;
              return (
                <div className="task-card border-warning/30 border-2">
                  <div className="flex items-center gap-2 mb-3">
                    <PackageOpen size={18} className="text-warning" />
                    <h3 className="font-bold text-sm">התרעות חוסרים</h3>
                    <span className="status-badge bg-warning/15 text-warning text-[10px] mr-auto">
                      {totalAlerts} התרעות היום
                    </span>
                  </div>
                  <div className="space-y-2">
                    {alertItems.map(([item, locations]) => (
                      <div key={item} className="flex items-start gap-3 p-2.5 rounded-lg bg-warning/5 border border-warning/20">
                        <PackageOpen size={14} className="text-warning shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold">{item}</p>
                          <p className="text-[10px] text-muted-foreground">{locations.join(" · ")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <StaffTrackingGrid
              assignments={assignments}
              staff={mockStaff}
              onReassign={handleReassign}
            />
          </div>
        )}

        {activeTab === "endOfDay" && (
          <div className="animate-slide-up space-y-6">
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

            <button
              onClick={() => setShowEndOfDay(true)}
              className="btn-action-primary w-full flex items-center justify-center gap-3"
            >
              <BarChart3 size={20} />
              ניתוח סוף יום
            </button>
          </div>
        )}
      </div>

      {/* Drill-down modal */}
      {drillDown && (
        <DrillDownPanel
          type={drillDown}
          assignments={assignments}
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
