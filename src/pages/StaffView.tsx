import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  Play,
  Square,
  AlertTriangle,
  Coffee,
  ChevronLeft,
  PackageOpen,
  CheckCircle2,
  Timer,
  CalendarDays,
  BarChart3,
  Zap,
  Image,
  Home,
  MapPin,
  XCircle,
  Gauge,
  LogOut,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { mockAssignments, type TaskAssignment } from "@/data/mockData";
import { scheduledTimes } from "@/data/staffSchedule";
import DaySchedule from "@/components/staff/DaySchedule";
import EndOfDayAnalysis from "@/components/staff/EndOfDayAnalysis";
import TaskTile from "@/components/staff/TaskTile";
import { useI18n } from "@/i18n/I18nContext";
import { calculateWorkerWorkload, getHeatLevel, type ShiftConfig } from "@/lib/scheduling-engine";
import { supabase } from "@/integrations/supabase/client";

const stockItems = [
  { key: "Soap", labelKey: "stock.soap" },
  { key: "Paper Towels", labelKey: "stock.paperTowels" },
  { key: "Sanitizer", labelKey: "stock.sanitizer" },
  { key: "Trash Bags", labelKey: "stock.trashBags" },
];

type StaffScreen = "home" | "taskDetail" | "schedule" | "analysis";

const StaffView = () => {
  const { t } = useI18n();
  const { signOut } = useAuth();
  const staffAssignments = mockAssignments.filter((a) => a.staff.id === "s1");
  const initialIndex = staffAssignments.findIndex((a) => a.status === "in_progress") >= 0
    ? staffAssignments.findIndex((a) => a.status === "in_progress")
    : staffAssignments.findIndex((a) => a.status === "pending");
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [allDone, setAllDone] = useState(initialIndex === -1);
  const [isRunning, setIsRunning] = useState(
    staffAssignments[initialIndex]?.status === "in_progress"
  );
  const [onBreak, setOnBreak] = useState(false);
  const [stockLowItems, setStockLowItems] = useState<string[]>([]);
  const [showIssuePanel, setShowIssuePanel] = useState(false);
  const [stockReporting, setStockReporting] = useState(false);
  const [reportedItems, setReportedItems] = useState<Set<string>>(new Set());
  const [screen, setScreen] = useState<StaffScreen>("home");
  const [breakFixStatus, setBreakFixStatus] = useState<"idle" | "in_progress" | "done">("idle");
  const [breakFixSeconds, setBreakFixSeconds] = useState(0);
  const [taskSeconds, setTaskSeconds] = useState(
    (staffAssignments[initialIndex]?.elapsedMinutes || 0) * 60
  );

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (breakFixStatus === "in_progress") {
      interval = setInterval(() => setBreakFixSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [breakFixStatus]);

  const current = staffAssignments[currentIndex];
  const nextTask = currentIndex < staffAssignments.length - 1 ? staffAssignments[currentIndex + 1] : null;
  const thirdTask = currentIndex < staffAssignments.length - 2 ? staffAssignments[currentIndex + 2] : null;
  const completedCount = staffAssignments.filter((a) => a.status === "completed").length;
  const totalCount = staffAssignments.length;

  // Shift capacity
  const defaultShift: ShiftConfig = { startTime: "07:00", endTime: "15:00", breakMinutes: 30 };
  const workload = useMemo(() => {
    const durations = staffAssignments.map((a) => a.task.estimatedMinutes);
    return calculateWorkerWorkload("s1", "", durations, defaultShift);
  }, [staffAssignments]);
  const heat = getHeatLevel(workload.utilizationPercent);
  const remainingMinutes = Math.max(0, workload.availableMinutes - staffAssignments
    .filter((a) => a.status === "completed")
    .reduce((s, a) => s + (a.elapsedMinutes || a.task.estimatedMinutes), 0) - (isRunning ? Math.floor(taskSeconds / 60) : 0));

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && !onBreak) {
      interval = setInterval(() => {
        setTaskSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, onBreak]);

  const handleStart = () => {
    setIsRunning(true);
    setTaskSeconds(0);
    setScreen("taskDetail");
  };
  const handleFinish = () => {
    setIsRunning(false);
    setTaskSeconds(0);
    setStockLowItems([]);
    if (currentIndex < staffAssignments.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setScreen("home");
    } else {
      setAllDone(true);
      setScreen("home");
    }
  };

  const toggleStock = (item: string) => {
    setStockLowItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleReportShortage = useCallback(async () => {
    if (stockLowItems.length === 0 || !current) return;
    setStockReporting(true);
    try {
      // Use a deterministic UUID for mock staff IDs
      const staffUuid = current.staff.id.length < 36
        ? `00000000-0000-0000-0000-00000000000${current.staff.id.replace(/\D/g, "") || "0"}`
        : current.staff.id;
      const rows = stockLowItems.map((item) => ({
        staff_id: staffUuid,
        assignment_id: current.id,
        item,
        zone_name: current.task.zone.name,
      }));
      const { error } = await supabase.from("supply_alerts").insert(rows);
      if (error) throw error;
      setReportedItems((prev) => {
        const next = new Set(prev);
        stockLowItems.forEach((i) => next.add(i));
        return next;
      });
      setStockLowItems([]);
      toast({ title: "✓ דיווח חוסר נשלח", description: `${rows.length} פריטים דווחו בהצלחה` });
    } catch {
      toast({ title: "שגיאה", description: "לא ניתן לשלוח דיווח כרגע", variant: "destructive" });
    } finally {
      setStockReporting(false);
    }
  }, [stockLowItems, current]);

  const overdueAlertSent = useRef(false);
  const taskElapsedMinutes = current ? Math.floor(taskSeconds / 60) : 0;
  const overdueThreshold = current ? Math.max(Math.round(current.task.estimatedMinutes * 0.15), 2) : 2;
  const isOverdue = current ? taskElapsedMinutes > current.task.estimatedMinutes + overdueThreshold : false;

  useEffect(() => {
    if (isOverdue && isRunning && !overdueAlertSent.current && current) {
      overdueAlertSent.current = true;
      toast({
        title: `⚠️ ${t("worker.overdueAlert")}`,
        description: t("worker.overdueDetail", {
          zone: current.task.zone.name,
          minutes: String(taskElapsedMinutes - current.task.estimatedMinutes),
        }),
        variant: "destructive",
      });
    }
  }, [isOverdue, isRunning]);

  useEffect(() => {
    overdueAlertSent.current = false;
  }, [currentIndex]);

  // Issue types
  const issueTypes = [
    t("issues.spill"),
    t("issues.plumbing"),
    t("issues.equipment"),
    t("issues.safety"),
    t("issues.other"),
  ];

  if (screen === "schedule") {
    return <DaySchedule assignments={staffAssignments} currentIndex={currentIndex} onClose={() => setScreen("home")} />;
  }
  if (screen === "analysis") {
    return <EndOfDayAnalysis assignments={staffAssignments} onClose={() => setScreen("home")} />;
  }

  // ═══ ALL DONE SCREEN ═══
  if (allDone || !current) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="text-center animate-slide-up mb-6">
          <CheckCircle2 className="mx-auto mb-4 text-success" size={64} />
          <h1 className="text-2xl font-bold mb-2">{t("worker.allDone")}</h1>
          <p className="text-muted-foreground">{t("worker.greatWork")}</p>
        </div>
        <button onClick={() => setScreen("analysis")} className="btn-action-primary flex items-center justify-center gap-3 w-full max-w-xs">
          <BarChart3 size={20} />
          {t("worker.endOfDay")}
        </button>
        <button onClick={signOut} className="flex items-center justify-center gap-2 w-full max-w-xs mt-3 py-3 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
          <LogOut size={16} />
          התנתק
        </button>
      </div>
    );
  }

  const progressPercent = Math.min((taskElapsedMinutes / current.task.estimatedMinutes) * 100, 100);
  const taskTimeDisplay = `${String(Math.floor(taskSeconds / 60)).padStart(2, "0")}:${String(taskSeconds % 60).padStart(2, "0")}`;

  // ═══ TASK DETAIL SCREEN (when running) ═══
  if (screen === "taskDetail") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setScreen("home")} className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
              <Home size={18} />
            </button>
            <div>
              <p className="text-xs opacity-75 uppercase tracking-wider">CleanFlow</p>
              <h1 className="text-lg font-bold">{t("worker.advancedDetails")}</h1>
            </div>
          </div>
          <div className="text-left">
            <p className="text-xs opacity-75">{t("manager.tasks")}</p>
            <p className="text-lg font-bold mono">{completedCount}/{totalCount}</p>
          </div>
        </header>

        <div className="flex-1 px-4 py-4 flex flex-col gap-4 overflow-y-auto">
          {/* Break-fix banner */}
          {(() => {
            const pendingBreakFix = staffAssignments.find((a) => a.isBreakFix && a.status !== "completed");
            if (!pendingBreakFix || breakFixStatus === "done") return null;
            return (
              <div className="bg-warning/15 border-2 border-warning rounded-xl px-4 py-4 animate-pulse-slow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-warning/25 flex items-center justify-center shrink-0">
                    <Zap size={28} className="text-warning" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-warning">{t("worker.breakFixRequired")}</p>
                    <p className="text-sm text-warning/80">{pendingBreakFix.breakFixDescription || t("worker.breakFix")}</p>
                  </div>
                </div>
                {breakFixStatus === "idle" ? (
                  <button onClick={() => setBreakFixStatus("in_progress")} className="w-full py-3 rounded-xl bg-warning text-warning-foreground font-bold text-base flex items-center justify-center gap-2 hover:bg-warning/90 transition-colors">
                    <Play size={20} />
                    {t("worker.startFix")}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2 py-2">
                      <Timer size={18} className="text-warning" />
                      <span className="text-2xl font-black mono text-warning">
                        {String(Math.floor(breakFixSeconds / 60)).padStart(2, "0")}:{String(breakFixSeconds % 60).padStart(2, "0")}
                      </span>
                    </div>
                    <button onClick={() => setBreakFixStatus("done")} className="w-full py-3 rounded-xl bg-success text-success-foreground font-bold text-base flex items-center justify-center gap-2 hover:bg-success/90 transition-colors">
                      <CheckCircle2 size={20} />
                      {t("worker.endFix")}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Current task detail card */}
          <div className={`task-card flex-1 animate-slide-up ${isOverdue ? 'border-destructive border-2' : current.isBreakFix ? 'border-warning border-2' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              {current.isBreakFix ? (
                <span className="status-badge bg-warning/15 text-warning flex items-center gap-1">
                  <Zap size={14} />
                  {t("worker.breakFix")}
                </span>
              ) : (
                <span className={`status-badge ${
                  current.task.type === "maintenance" ? "bg-info/15 text-info" : "bg-accent/15 text-accent-foreground"
                }`}>
                  {current.task.type === "maintenance" ? t("analysis.quick") : t("analysis.deep")}
                </span>
              )}
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                {t("worker.taskOf", { current: String(currentIndex + 1), total: String(totalCount) })}
              </span>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <MapPin size={14} />
                <span className="text-sm">{t("schedule.planned")}: {current.task.zone.wing} · {current.task.zone.floor}</span>
              </div>
              <h2 className="text-2xl font-bold">{current.task.zone.name}</h2>
              <p className="text-muted-foreground mt-1">
                {current.isBreakFix && current.breakFixDescription ? current.breakFixDescription : current.task.name}
              </p>
              {scheduledTimes[current.id] && (
                <p className="text-sm mono text-muted-foreground mt-1">
                  {t("schedule.planned")}: {scheduledTimes[current.id].plannedStart} – {scheduledTimes[current.id].plannedEnd}
                </p>
              )}
            </div>

            {/* Break-fix image */}
            {current.isBreakFix && current.breakFixImageUrl && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Image size={12} />
                  {t("supervisor.attachImage")}
                </p>
                <img src={current.breakFixImageUrl} alt="" className="w-full h-48 object-cover rounded-lg border border-border" />
              </div>
            )}

            {/* Timer */}
            <div className={`mb-6 ${isOverdue ? 'bg-destructive/10 border border-destructive/30 rounded-xl p-3 animate-pulse-slow' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Timer size={16} className={isOverdue ? 'text-destructive' : isRunning ? 'text-success' : 'text-muted-foreground'} />
                  <span className={`mono text-2xl font-bold ${isOverdue ? 'text-destructive' : isRunning ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {taskTimeDisplay}
                  </span>
                  <span className="text-xs text-muted-foreground">/ {current.task.estimatedMinutes} {t("common.minutes")}</span>
                </div>
                {isOverdue && (
                  <span className="status-badge status-overdue flex items-center gap-1">
                    <AlertTriangle size={12} />
                    {t("worker.sla.breached")}
                  </span>
                )}
              </div>
              <Progress value={progressPercent} className={`h-3 ${isOverdue ? '[&>div]:bg-destructive' : '[&>div]:bg-success'}`} />
            </div>

            {/* Break button */}
            {isRunning && (
              <button onClick={() => setOnBreak(!onBreak)} className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-colors mb-4 ${
                onBreak ? "bg-accent/15 border-accent text-accent-foreground" : "border-border text-muted-foreground hover:bg-muted"
              }`}>
                <Coffee size={16} />
                {onBreak ? t("worker.backToWork") : t("worker.breakButton")}
              </button>
            )}

            {/* Stock check */}
            {isRunning && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <PackageOpen size={12} />
                  {t("worker.stockCheck")}
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {stockItems.map(({ key, labelKey }) => {
                    const alreadyReported = reportedItems.has(key);
                    return (
                      <button
                        key={key}
                        onClick={() => !alreadyReported && toggleStock(key)}
                        disabled={alreadyReported}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          alreadyReported
                            ? "bg-success/15 border-success text-success cursor-default"
                            : stockLowItems.includes(key)
                            ? "bg-warning/15 border-warning text-warning-foreground"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {alreadyReported ? "✓ " : stockLowItems.includes(key) ? "⚠ " : ""}{t(labelKey)}
                      </button>
                    );
                  })}
                </div>
                {stockLowItems.length > 0 && (
                  <button
                    onClick={handleReportShortage}
                    disabled={stockReporting}
                    className="w-full py-2.5 rounded-lg bg-warning text-warning-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-warning/90 transition-colors disabled:opacity-50"
                  >
                    <PackageOpen size={16} />
                    {stockReporting ? "שולח..." : `דווח חוסר (${stockLowItems.length})`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            {isRunning && (
              <button onClick={handleFinish} className="btn-action-primary w-full flex items-center justify-center gap-3">
                <Square size={24} />
                {t("worker.complete")}
              </button>
            )}
            <button onClick={() => setShowIssuePanel(!showIssuePanel)} className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-destructive text-destructive font-bold transition-colors hover:bg-destructive/10">
              <AlertTriangle size={20} />
              {t("worker.reportIssue")}
            </button>
            <button onClick={() => {}} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-muted-foreground/30 text-muted-foreground font-medium transition-colors hover:bg-muted">
              <XCircle size={18} />
              {t("worker.cannotPerform")}
            </button>
          </div>

          {/* Issue panel */}
          {showIssuePanel && (
            <div className="task-card animate-slide-up space-y-2">
              <p className="font-semibold text-sm mb-3">{t("issues.selectType")}</p>
              {issueTypes.map((issue) => (
                <button key={issue} onClick={() => setShowIssuePanel(false)} className="w-full text-right px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors flex items-center justify-between">
                  <ChevronLeft size={16} className="text-muted-foreground" />
                  <span className="text-sm font-medium">{issue}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══ HOME SCREEN — 3 TASK TILES ═══
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs opacity-75 uppercase tracking-wider">CleanFlow</p>
          <h1 className="text-lg font-bold">{t("worker.homeTitle")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setScreen("schedule")} className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors" title={t("worker.schedule")}>
            <CalendarDays size={18} />
          </button>
          <button onClick={() => setScreen("analysis")} className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors" title={t("worker.performance")}>
            <BarChart3 size={18} />
          </button>
          <button onClick={signOut} className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors" title="התנתק">
            <LogOut size={18} />
          </button>
          <div className="text-left">
            <p className="text-xs opacity-75">{completedCount}/{totalCount}</p>
          </div>
        </div>
      </header>

      {/* Progress pips */}
      <div className="px-4 py-3 flex gap-1.5">
        {staffAssignments.map((a, i) => (
          <div key={a.id} className={`h-1.5 flex-1 rounded-full transition-colors ${
            a.status === "completed" ? "bg-success" :
            i === currentIndex ? (isRunning ? "bg-accent animate-pulse-slow" : "bg-accent") :
            a.isBreakFix ? "bg-warning" : "bg-muted"
          }`} />
        ))}
      </div>

      {/* Shift capacity indicator */}
      <div className="mx-4 mb-3 flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
        <Gauge size={14} className={
          heat === "cool" ? "text-success" :
          heat === "warm" ? "text-warning" :
          heat === "hot" ? "text-accent" :
          "text-destructive"
        } />
        <div className="flex-1">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-muted-foreground">קיבולת משמרת</span>
            <span className="mono font-semibold">{remainingMinutes} דק׳ נותרו</span>
          </div>
          <Progress
            value={workload.utilizationPercent}
            className={`h-1.5 ${
              heat === "cool" ? "[&>div]:bg-success" :
              heat === "warm" ? "[&>div]:bg-warning" :
              heat === "hot" ? "[&>div]:bg-accent" :
              "[&>div]:bg-destructive"
            }`}
          />
        </div>
        {current && (
          <span className="text-[10px] mono text-muted-foreground">
            ~{current.task.estimatedMinutes} דק׳
          </span>
        )}
      </div>

      {/* Break-fix banner (compact on home) */}
      {(() => {
        const pendingBreakFix = staffAssignments.find((a) => a.isBreakFix && a.status !== "completed");
        if (!pendingBreakFix || breakFixStatus === "done") return null;
        return (
          <div className="mx-4 mb-3 bg-warning/15 border-2 border-warning rounded-xl px-4 py-3 animate-pulse-slow">
            <div className="flex items-center gap-3">
              <Zap size={24} className="text-warning shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-base font-black text-warning">{t("worker.breakFixRequired")}</p>
                <p className="text-xs text-warning/80 truncate">{pendingBreakFix.breakFixDescription}</p>
              </div>
              {breakFixStatus === "idle" ? (
                <button onClick={() => { setBreakFixStatus("in_progress"); setScreen("taskDetail"); }} className="px-4 py-2 rounded-lg bg-warning text-warning-foreground font-bold text-sm shrink-0">
                  <Play size={16} />
                </button>
              ) : (
                <span className="mono text-warning font-bold">
                  {String(Math.floor(breakFixSeconds / 60)).padStart(2, "0")}:{String(breakFixSeconds % 60).padStart(2, "0")}
                </span>
              )}
            </div>
          </div>
        );
      })()}

      {/* 3 Task Tiles */}
      <div className="flex-1 px-4 pb-4 flex flex-col gap-3">
        {/* Current Task */}
        {current && (
          <TaskTile
            assignment={current}
            label={t("worker.currentTask")}
            isActive={isRunning}
            isCurrent={true}
            onTap={() => setScreen("taskDetail")}
            onReportIssue={() => { setScreen("taskDetail"); setShowIssuePanel(true); }}
          />
        )}

        {/* Next Task */}
        {nextTask && (
          <TaskTile
            assignment={nextTask}
            label={t("worker.nextTask")}
            isActive={false}
            isCurrent={false}
          />
        )}

        {/* Third Task */}
        {thirdTask && (
          <TaskTile
            assignment={thirdTask}
            label={t("worker.thirdTask")}
            isActive={false}
            isCurrent={false}
          />
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Primary action button */}
        <div className="space-y-3">
          {!isRunning ? (
            <button onClick={handleStart} className="btn-action-success w-full flex items-center justify-center gap-3">
              <Play size={24} />
              {t("worker.start")}
            </button>
          ) : (
            <button onClick={() => setScreen("taskDetail")} className="btn-action-primary w-full flex items-center justify-center gap-3">
              <Timer size={24} />
              <span className="mono text-xl">{taskTimeDisplay}</span>
              <span className="text-sm opacity-75">— {t("worker.advancedDetails")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffView;
