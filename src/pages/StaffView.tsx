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
import NextTaskPreview from "@/components/staff/NextTaskPreview";
import MyPointsWidget from "@/components/staff/MyPointsWidget";
import { useI18n } from "@/i18n/I18nContext";
import { calculateWorkerWorkload, getHeatLevel, type ShiftConfig } from "@/lib/scheduling-engine";
import { supabase } from "@/integrations/supabase/client";
import breakIllustration from "@/assets/break-illustration.png";

const stockItems = [
  { key: "Soap", labelKey: "stock.soap" },
  { key: "Paper Towels", labelKey: "stock.paperTowels" },
  { key: "Sanitizer", labelKey: "stock.sanitizer" },
  { key: "Trash Bags", labelKey: "stock.trashBags" },
];

type StaffScreen = "welcome" | "home" | "taskDetail" | "schedule" | "analysis";

const StaffView = () => {
  const { t } = useI18n();
  const { signOut, user } = useAuth();
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
  const [screen, setScreen] = useState<StaffScreen>("welcome");
  const [breakFixStatus, setBreakFixStatus] = useState<"idle" | "in_progress" | "done">("idle");
  const [breakFixSeconds, setBreakFixSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [showStockPanel, setShowStockPanel] = useState(false);
  const [showCannotPerform, setShowCannotPerform] = useState(false);
  const [cannotPerformReason, setCannotPerformReason] = useState("");
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

  // Break timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (onBreak) {
      interval = setInterval(() => setBreakSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [onBreak]);

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

  const handleStartBreak = () => {
    setOnBreak(true);
    setBreakSeconds(0);
    if (isRunning) setIsRunning(false);
  };
  const handleEndBreak = () => {
    setOnBreak(false);
    setBreakSeconds(0);
  };
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

  // ═══ WELCOME SCREEN ═══
  if (screen === "welcome") {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "בוקר טוב" : hour < 17 ? "צהריים טובים" : "ערב טוב";
    const greetingEmoji = hour < 12 ? "☀️" : hour < 17 ? "🌤️" : "🌙";

    // Extract unique floors from assignments
    const floors = [...new Set(staffAssignments.map((a) => a.task.zone.floor))];
    const floorsText = floors.length === 1
      ? `קומה ${floors[0]}`
      : `קומות ${floors.join(", ")}`;

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-8">
          {/* Greeting */}
          <div className="animate-fade-in" style={{ animationDuration: '0.6s' }}>
            <p className="text-6xl mb-4 animate-scale-in" style={{ animationDuration: '0.8s', animationDelay: '0.2s', animationFillMode: 'both' }}>{greetingEmoji}</p>
            <h1 className="text-4xl font-black text-foreground mb-2 animate-fade-in" style={{ animationDuration: '0.6s', animationDelay: '0.4s', animationFillMode: 'both' }}>{greeting}{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}!</h1>
            <p className="text-lg text-muted-foreground animate-fade-in" style={{ animationDuration: '0.6s', animationDelay: '0.6s', animationFillMode: 'both' }}>שמחים שהגעת למשמרת</p>
          </div>

          {/* Assignment info */}
          <div className="bg-primary/10 border-2 border-primary/20 rounded-2xl p-6 space-y-3 animate-scale-in" style={{ animationDuration: '0.5s', animationDelay: '0.8s', animationFillMode: 'both' }}>
            <div className="flex items-center justify-center gap-2 text-primary">
              <MapPin size={22} />
              <p className="text-lg font-bold">היום שובצת לעבוד ב{floorsText}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {staffAssignments.length} משימות מתוכננות
            </p>
          </div>

          {/* Good luck */}
          <div className="animate-scale-in" style={{ animationDuration: '0.5s', animationDelay: '1.1s', animationFillMode: 'both' }}>
            <p className="text-3xl font-black text-primary">בהצלחה! 💪</p>
          </div>

          {/* Continue button */}
          <button
            onClick={() => setScreen("home")}
            className="btn-action-primary w-full flex items-center justify-center gap-3 text-lg py-4 animate-fade-in"
            style={{ animationDuration: '0.5s', animationDelay: '1.4s', animationFillMode: 'both' }}
          >
            <Play size={22} />
            יאללה, מתחילים
          </button>
        </div>
      </div>
    );
  }

  if (screen === "schedule") {
    return <DaySchedule assignments={staffAssignments} currentIndex={currentIndex} onClose={() => setScreen("home")} />;
  }
  if (screen === "analysis") {
    return <EndOfDayAnalysis assignments={staffAssignments} onClose={() => setScreen("home")} />;
  }

  // ═══ BREAK SCREEN ═══
  if (onBreak) {
    const breakTimeDisplay = `${String(Math.floor(breakSeconds / 60)).padStart(2, "0")}:${String(breakSeconds % 60).padStart(2, "0")}`;
    const pendingBreakFix = staffAssignments.find((a) => a.isBreakFix && a.status !== "completed");
    const showBreakFix = pendingBreakFix && breakFixStatus !== "done";

    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        {/* Break-fix banner at top even during break */}
        {showBreakFix && (
          <div className="mx-3 mt-3 bg-destructive/15 border-2 border-destructive rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-destructive shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-destructive">{t("worker.breakFixRequired")}</p>
                <p className="text-sm font-black text-destructive truncate">{pendingBreakFix.breakFixDescription}</p>
              </div>
              {breakFixStatus === "idle" ? (
                <button onClick={() => { handleEndBreak(); setBreakFixStatus("in_progress"); setScreen("taskDetail"); }} className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground font-bold text-xs shrink-0">
                  <Play size={14} />
                </button>
              ) : (
                <span className="mono text-sm text-destructive font-bold">
                  {String(Math.floor(breakFixSeconds / 60)).padStart(2, "0")}:{String(breakFixSeconds % 60).padStart(2, "0")}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Break content - compact to fit one screen */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
          <img src={breakIllustration} alt="הפסקה" className="w-28 h-28 object-contain rounded-2xl opacity-90" />
          
          <div>
            <h1 className="text-2xl font-black text-foreground">{t("worker.onBreakTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("worker.onBreakSubtitle")}</p>
          </div>

          {/* Break timer */}
          <div className="bg-primary/10 border-2 border-primary/20 rounded-2xl px-6 py-3">
            <div className="flex items-center justify-center gap-2">
              <Timer size={20} className="text-primary" />
              <span className="mono text-4xl font-black text-foreground">{breakTimeDisplay}</span>
            </div>
          </div>

          {/* Next task preview */}
          {current && (
            <div className="w-full max-w-sm">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t("worker.nextTaskAfterBreak")}</p>
              <NextTaskPreview assignment={current} />
            </div>
          )}
        </div>

        {/* End break button pinned to bottom */}
        <div className="px-6 pb-6 pt-2">
          <button
            onClick={handleEndBreak}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-colors"
          >
            <Play size={22} />
            {t("worker.backToWork")}
          </button>
        </div>
      </div>
    );
  }

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

  const handleCannotPerform = () => {
    if (!cannotPerformReason.trim()) return;
    toast({
      title: "⚠️ דיווח 'לא ניתן לבצע' נשלח",
      description: `${current.task.zone.name} — ${cannotPerformReason}`,
      variant: "destructive",
    });
    setShowCannotPerform(false);
    setCannotPerformReason("");
    // Skip to next task
    if (currentIndex < staffAssignments.length - 1) {
      setIsRunning(false);
      setTaskSeconds(0);
      setCurrentIndex(currentIndex + 1);
      setScreen("home");
    } else {
      setIsRunning(false);
      setAllDone(true);
      setScreen("home");
    }
  };

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

        <div className="flex-1 px-4 py-4 flex flex-col gap-4 overflow-y-auto pb-28">
          {/* Break-fix banner */}
          {(() => {
            const pendingBreakFix = staffAssignments.find((a) => a.isBreakFix && a.status !== "completed");
            if (!pendingBreakFix || breakFixStatus === "done") return null;
            return (
              <div className="bg-destructive/15 border-2 border-destructive rounded-xl px-4 py-4 animate-pulse-slow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-destructive/25 flex items-center justify-center shrink-0">
                    <Zap size={28} className="text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-destructive">{t("worker.breakFixRequired")}</p>
                    <p className="text-xl font-black text-destructive">{pendingBreakFix.breakFixDescription || t("worker.breakFix")}</p>
                  </div>
                </div>
                {breakFixStatus === "idle" ? (
                  <button onClick={() => setBreakFixStatus("in_progress")} className="w-full py-3 rounded-xl bg-destructive text-destructive-foreground font-bold text-base flex items-center justify-center gap-2 hover:bg-destructive/90 transition-colors">
                    <Play size={20} />
                    {t("worker.startFix")}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2 py-2">
                      <Timer size={18} className="text-destructive" />
                      <span className="text-2xl font-black mono text-destructive">
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
            <div className={`mb-4 ${isOverdue ? 'bg-destructive/10 border border-destructive/30 rounded-xl p-3 animate-pulse-slow' : ''}`}>
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

            {/* Start / Finish buttons inside the card */}
            {!isRunning && (
              <button onClick={handleStart} className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-success text-success-foreground font-bold text-base hover:bg-success/90 transition-colors mb-3">
                <Play size={24} />
                {t("worker.start")}
              </button>
            )}
            {isRunning && (
              <button onClick={handleFinish} className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 transition-colors mb-3">
                <Square size={24} />
                {t("worker.complete")}
              </button>
            )}

            {/* Cannot perform button */}
            <button
              onClick={() => setShowCannotPerform(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-destructive/30 text-destructive font-medium transition-colors hover:bg-destructive/10"
            >
              <XCircle size={18} />
              {t("worker.cannotPerform")}
            </button>
          </div>

          {/* Cannot perform dialog */}
          {showCannotPerform && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setShowCannotPerform(false)}>
              <div className="w-full max-w-sm bg-background rounded-2xl p-5 animate-scale-in space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle size={22} />
                  <h3 className="font-bold text-lg">{t("worker.cannotPerform")}</h3>
                </div>
                <p className="text-sm text-muted-foreground">הדיווח יישלח מיידית למנהל הנכס/אתר</p>
                <textarea
                  value={cannotPerformReason}
                  onChange={(e) => setCannotPerformReason(e.target.value)}
                  placeholder="תאר את הסיבה..."
                  className="w-full h-24 px-3 py-2 rounded-xl border border-border bg-muted/30 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-destructive/50"
                  dir="rtl"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCannotPerform(false)}
                    className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={handleCannotPerform}
                    disabled={!cannotPerformReason.trim()}
                    className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm hover:bg-destructive/90 transition-colors disabled:opacity-50"
                  >
                    {t("common.send")}
                  </button>
                </div>
              </div>
            </div>
          )}

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

        {/* Fixed bottom action banner — same as home */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 flex items-center justify-around gap-2 z-40">
          <button
            onClick={() => setShowIssuePanel(true)}
            className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-destructive/10 transition-colors"
          >
            <AlertTriangle size={20} className="text-destructive" />
            <span className="text-[10px] font-medium text-destructive">{t("worker.reportIssue")}</span>
          </button>
          <button
            onClick={() => setShowStockPanel(!showStockPanel)}
            className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-warning/10 transition-colors"
          >
            <PackageOpen size={20} className="text-warning" />
            <span className="text-[10px] font-medium text-warning">{t("worker.reportShortage")}</span>
          </button>
          <button
            onClick={handleStartBreak}
            className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-primary/10 transition-colors"
          >
            <Coffee size={20} className="text-primary" />
            <span className="text-[10px] font-medium text-primary">{t("worker.breakButton")}</span>
          </button>
        </div>

        {/* Stock reporting modal */}
        {showStockPanel && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setShowStockPanel(false)}>
            <div className="w-full max-w-lg bg-background rounded-t-2xl p-5 animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm font-bold mb-3 flex items-center gap-2">
                <PackageOpen size={16} className="text-warning" />
                {t("worker.reportShortage")}
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
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
                  onClick={() => { handleReportShortage(); setShowStockPanel(false); }}
                  disabled={stockReporting}
                  className="w-full py-3 rounded-xl bg-warning text-warning-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-warning/90 transition-colors disabled:opacity-50"
                >
                  <PackageOpen size={16} />
                  {stockReporting ? "שולח..." : `דווח חוסר (${stockLowItems.length})`}
                </button>
              )}
            </div>
          </div>
        )}
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
          <div className="mx-4 mb-3 bg-destructive/15 border-2 border-destructive rounded-xl px-4 py-3 animate-pulse-slow">
            <div className="flex items-center gap-3">
              <Zap size={24} className="text-destructive shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-destructive">{t("worker.breakFixRequired")}</p>
                <p className="text-sm font-black text-destructive truncate">{pendingBreakFix.breakFixDescription}</p>
              </div>
              {breakFixStatus === "idle" ? (
                <button onClick={() => { setBreakFixStatus("in_progress"); setScreen("taskDetail"); }} className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-bold text-sm shrink-0">
                  <Play size={16} />
                </button>
              ) : (
                <span className="mono text-destructive font-bold">
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
            onStart={handleStart}
            onFinish={handleFinish}
            taskTimeDisplay={isRunning ? taskTimeDisplay : undefined}
            orderNumber={currentIndex + 1}
            totalTasks={totalCount}
          />
        )}

        {/* Next Task */}
        {nextTask && (
          <TaskTile
            assignment={nextTask}
            label={t("worker.nextTask")}
            isActive={false}
            isCurrent={false}
            orderNumber={currentIndex + 2}
            totalTasks={totalCount}
          />
        )}

        {/* Third Task */}
        {thirdTask && (
          <TaskTile
            assignment={thirdTask}
            label={t("worker.thirdTask")}
            isActive={false}
            isCurrent={false}
            orderNumber={currentIndex + 3}
            totalTasks={totalCount}
          />
        )}

        {/* My Points Widget */}
        <MyPointsWidget />

        {/* Spacer for bottom banner */}
        <div className="h-20" />
      </div>

      {/* Fixed bottom action banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 flex items-center justify-around gap-2 z-40">
        <button
          onClick={() => { setScreen("taskDetail"); setShowIssuePanel(true); }}
          className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-destructive/10 transition-colors"
        >
          <AlertTriangle size={20} className="text-destructive" />
          <span className="text-[10px] font-medium text-destructive">{t("worker.reportIssue")}</span>
        </button>
        <button
          onClick={() => setShowStockPanel(!showStockPanel)}
          className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-warning/10 transition-colors"
        >
          <PackageOpen size={20} className="text-warning" />
          <span className="text-[10px] font-medium text-warning">{t("worker.reportShortage")}</span>
        </button>
        <button
          onClick={handleStartBreak}
          className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-primary/10 transition-colors"
        >
          <Coffee size={20} className="text-primary" />
          <span className="text-[10px] font-medium text-primary">{t("worker.breakButton")}</span>
        </button>
      </div>

      {/* Stock reporting modal */}
      {showStockPanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setShowStockPanel(false)}>
          <div className="w-full max-w-lg bg-background rounded-t-2xl p-5 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold mb-3 flex items-center gap-2">
              <PackageOpen size={16} className="text-warning" />
              {t("worker.reportShortage")}
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
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
                onClick={() => { handleReportShortage(); setShowStockPanel(false); }}
                disabled={stockReporting}
                className="w-full py-3 rounded-xl bg-warning text-warning-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-warning/90 transition-colors disabled:opacity-50"
              >
                <PackageOpen size={16} />
                {stockReporting ? "שולח..." : `דווח חוסר (${stockLowItems.length})`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffView;
