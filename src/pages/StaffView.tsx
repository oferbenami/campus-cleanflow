import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  Play,
  AlertTriangle,
  Coffee,
  PackageOpen,
  CheckCircle2,
  Timer,
  CalendarDays,
  BarChart3,
  Home,
  MapPin,
  XCircle,
  LogOut,
  Loader2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/i18n/I18nContext";
import { useStaffAssignment } from "@/hooks/useStaffAssignment";
import LiveTaskTile, { getEscalationLevel } from "@/components/staff/LiveTaskTile";
import NfcScanSimulator from "@/components/staff/NfcScanSimulator";
import EndOfDayAnalysis from "@/components/staff/EndOfDayAnalysis";
import MyPointsWidget from "@/components/staff/MyPointsWidget";
import CannotPerformModal from "@/components/staff/CannotPerformModal";
import ShortageReportScreen from "@/components/staff/ShortageReportScreen";
import type { CannotPerformResult } from "@/components/staff/CannotPerformModal";
import { useShortageReports } from "@/hooks/useShortageReports";
import breakIllustration from "@/assets/break-illustration.png";

type StaffScreen = "welcome" | "home" | "taskDetail" | "analysis" | "shortage";
type ScanMode = { type: "entry" | "exit"; taskId: string; expectedUid: string | null; locationName: string } | null;

const StaffView = () => {
  const { t } = useI18n();
  const { signOut, user } = useAuth();
  const { assignment, tasks, loading, error, startTask, finishTask, cannotPerformTask, sendSlaAlert } = useStaffAssignment();
  const { submitShortageReport } = useShortageReports();
  const [shortageSubmitting, setShortageSubmitting] = useState(false);

  const [screen, setScreen] = useState<StaffScreen>("welcome");
  const [scanMode, setScanMode] = useState<ScanMode>(null);
  const [onBreak, setOnBreak] = useState(false);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [taskSeconds, setTaskSeconds] = useState(0);
  const [showCannotPerform, setShowCannotPerform] = useState(false);

  // Find current task (first non-completed, non-failed, non-blocked)
  const currentTask = tasks.find((t) => t.status === "in_progress") 
    || tasks.find((t) => t.status === "queued" || t.status === "ready");
  const isActive = currentTask?.status === "in_progress";
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const allDone = tasks.length > 0 && tasks.every((t) => t.status === "completed" || t.status === "failed");

  // Next tasks for preview
  const currentIdx = currentTask ? tasks.indexOf(currentTask) : -1;
  const nextTask = currentIdx >= 0 && currentIdx < tasks.length - 1 ? tasks[currentIdx + 1] : null;
  const thirdTask = currentIdx >= 0 && currentIdx < tasks.length - 2 ? tasks[currentIdx + 2] : null;

  // Task timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && !onBreak && currentTask?.started_at) {
      const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - new Date(currentTask.started_at!).getTime()) / 1000);
        setTaskSeconds(elapsed);
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, onBreak, currentTask?.started_at]);

  // Break timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (onBreak) {
      interval = setInterval(() => setBreakSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [onBreak]);

  // ── SLA Escalation Logic ──
  const slaAlertSent = useRef(false); // 115% alert
  const audioPlayed = useRef(false);  // 125% audio

  useEffect(() => {
    if (!currentTask || !isActive) return;
    const elapsedMin = taskSeconds / 60;
    const standard = currentTask.standard_minutes;

    // 115% -> send SLA alert to supervisor
    if (elapsedMin >= standard * 1.15 && !slaAlertSent.current) {
      slaAlertSent.current = true;
      sendSlaAlert(currentTask.id, Math.floor(elapsedMin));
      toast({
        title: "⚠️ חריגה מעל 15%",
        description: `${currentTask.location_name} — המפקח קיבל התראה`,
        variant: "destructive",
      });
    }

    // 125% -> audio alert + vibration
    if (elapsedMin >= standard * 1.25 && !audioPlayed.current) {
      audioPlayed.current = true;
      playAlertSound();
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    }
  }, [taskSeconds, currentTask, isActive, sendSlaAlert]);

  // Reset escalation refs when task changes
  useEffect(() => {
    slaAlertSent.current = false;
    audioPlayed.current = false;
  }, [currentTask?.id]);

  // ── Audio Alert ──
  const playAlertSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 1.5);
    } catch {
      // Audio not available
    }
  };

  // ── Handlers ──

  const handleScanToStart = (task: typeof currentTask) => {
    if (!task) return;
    setScanMode({
      type: "entry",
      taskId: task.id,
      expectedUid: task.location_nfc_tag_uid,
      locationName: task.location_name,
    });
  };

  const handleScanToFinish = (task: typeof currentTask) => {
    if (!task) return;
    setScanMode({
      type: "exit",
      taskId: task.id,
      expectedUid: task.location_nfc_tag_uid,
      locationName: task.location_name,
    });
  };

  const handleScanResult = useCallback(async (tagUid: string, isMatch: boolean) => {
    if (!scanMode) return;

    if (!isMatch) {
      if (tagUid !== "") {
        toast({
          title: "מיקום לא תואם!",
          description: "התג שנסרק לא מתאים למיקום המשימה",
          variant: "destructive",
        });
      }
      setScanMode(null);
      return;
    }

    try {
      if (scanMode.type === "entry") {
        await startTask(scanMode.taskId, tagUid);
        setTaskSeconds(0);
        toast({ title: "✓ משימה התחילה!" });
      } else {
        await finishTask(scanMode.taskId, tagUid);
        setTaskSeconds(0);
        toast({ title: "✓ משימה הושלמה! המשימה הבאה נטענה." });
      }
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    }

    setScanMode(null);
  }, [scanMode, startTask, finishTask]);

  const handleCannotPerform = async (result: CannotPerformResult) => {
    if (!currentTask) return;
    try {
      await cannotPerformTask(currentTask.id, result.reasonCode, result.note, result.action);
      
      const actionMsg = result.action === "defer_swap" 
        ? "המשימה הוחלפה עם המשימה הבאה" 
        : result.action === "defer_end"
        ? "המשימה הועברה לסוף התור"
        : "דיווח נשלח למפקח";
      
      toast({ title: "⚠️ לא ניתן לבצע", description: actionMsg, variant: "destructive" });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    }
    setShowCannotPerform(false);
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 size={40} className="mx-auto animate-spin text-primary" />
          <p className="text-muted-foreground">טוען נתוני משמרת...</p>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4">
          <CalendarDays size={48} className="mx-auto text-muted-foreground" />
          <h1 className="text-xl font-bold">אין משמרת פעילה היום</h1>
          <p className="text-muted-foreground text-sm">{error || "לא נמצא שיבוץ עבור היום"}</p>
          <button onClick={signOut} className="flex items-center justify-center gap-2 mx-auto py-3 px-6 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted">
            <LogOut size={16} />
            התנתק
          </button>
        </div>
      </div>
    );
  }

  // ── NFC Scan Modal ──
  const scanModal = scanMode && (
    <NfcScanSimulator
      expectedTagUid={scanMode.expectedUid}
      onScanResult={handleScanResult}
      mode={scanMode.type}
      locationName={scanMode.locationName}
    />
  );

  // ── Welcome Screen ──
  if (screen === "welcome") {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "בוקר טוב" : hour < 17 ? "צהריים טובים" : "ערב טוב";
    const greetingEmoji = hour < 12 ? "☀️" : hour < 17 ? "🌤️" : "🌙";

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-8">
          <div className="animate-fade-in">
            <p className="text-6xl mb-4">{greetingEmoji}</p>
            <h1 className="text-4xl font-black text-foreground mb-2">
              {greeting}{assignment.staff_name ? `, ${assignment.staff_name}` : ""}!
            </h1>
            <p className="text-lg text-muted-foreground">שמחים שהגעת למשמרת</p>
          </div>

          <div className="bg-primary/10 border-2 border-primary/20 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-center gap-2 text-primary">
              <MapPin size={22} />
              <p className="text-lg font-bold">{tasks.length} משימות מתוכננות</p>
            </div>
            <p className="text-sm text-muted-foreground">
              משמרת {assignment.shift_type === "morning" ? "בוקר" : "ערב"}
            </p>
          </div>

          <p className="text-3xl font-black text-primary">בהצלחה! 💪</p>

          <button
            onClick={() => setScreen("home")}
            className="btn-action-primary w-full flex items-center justify-center gap-3 text-lg py-4"
          >
            <Play size={22} />
            יאללה, מתחילים
          </button>
        </div>
      </div>
    );
  }

  // ── Shortage Screen ──
  if (screen === "shortage") {
    return (
      <ShortageReportScreen
        onClose={() => setScreen("home")}
        submitting={shortageSubmitting}
        onSubmit={async (items, location, category) => {
          setShortageSubmitting(true);
          try {
            await submitShortageReport(items, location, category);
            toast({ title: "✓ דיווח חוסרים נשלח!" });
            setScreen("home");
          } catch (err: any) {
            toast({ title: "שגיאה", description: err.message, variant: "destructive" });
          }
          setShortageSubmitting(false);
        }}
      />
    );
  }

  // ── Analysis Screen ──
  if (screen === "analysis") {
    return <EndOfDayAnalysis tasks={tasks} onClose={() => setScreen("home")} />;
  }

  // ── Break Screen ──
  if (onBreak) {
    const breakTimeDisplay = `${String(Math.floor(breakSeconds / 60)).padStart(2, "0")}:${String(breakSeconds % 60).padStart(2, "0")}`;
    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
          <img src={breakIllustration} alt="הפסקה" className="w-28 h-28 object-contain rounded-2xl opacity-90" />
          <h1 className="text-2xl font-black text-foreground">{t("worker.onBreakTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("worker.onBreakSubtitle")}</p>
          <div className="bg-primary/10 border-2 border-primary/20 rounded-2xl px-6 py-3">
            <div className="flex items-center justify-center gap-2">
              <Timer size={20} className="text-primary" />
              <span className="mono text-4xl font-black text-foreground">{breakTimeDisplay}</span>
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 pt-2">
          <button
            onClick={() => { setOnBreak(false); setBreakSeconds(0); }}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-colors"
          >
            <Play size={22} />
            {t("worker.backToWork")}
          </button>
        </div>
      </div>
    );
  }

  // ── All Done Screen ──
  if (allDone) {
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
        <button onClick={signOut} className="flex items-center justify-center gap-2 w-full max-w-xs mt-3 py-3 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted">
          <LogOut size={16} />
          התנתק
        </button>
      </div>
    );
  }

  // ── HOME SCREEN ──
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {scanModal}

      {/* Cannot Perform Modal */}
      {showCannotPerform && currentTask && (
        <CannotPerformModal
          task={currentTask}
          nextTask={nextTask && (nextTask.status === "queued" || nextTask.status === "ready") ? nextTask : null}
          onSubmit={handleCannotPerform}
          onCancel={() => setShowCannotPerform(false)}
        />
      )}

      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs opacity-75 uppercase tracking-wider">CleanFlow</p>
          <h1 className="text-lg font-bold">{t("worker.homeTitle")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setScreen("analysis")} className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
            <BarChart3 size={18} />
          </button>
          <button onClick={signOut} className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
            <LogOut size={18} />
          </button>
          <div className="text-left">
            <p className="text-xs opacity-75">{completedCount}/{tasks.length}</p>
          </div>
        </div>
      </header>

      {/* Progress pips */}
      <div className="px-4 py-3 flex gap-1.5">
        {tasks.map((t) => (
          <div key={t.id} className={`h-1.5 flex-1 rounded-full transition-colors ${
            t.status === "completed" ? "bg-success" :
            t.status === "in_progress" ? "bg-accent animate-pulse-slow" :
            t.status === "failed" ? "bg-destructive" :
            t.status === "blocked" ? "bg-warning" :
            "bg-muted"
          }`} />
        ))}
      </div>

      {/* Task Tiles */}
      <div className="flex-1 px-4 pb-4 flex flex-col gap-3">
        {currentTask && (
          <LiveTaskTile
            task={currentTask}
            isCurrent={true}
            isActive={isActive}
            orderNumber={currentIdx + 1}
            totalTasks={tasks.length}
            elapsedSeconds={isActive ? taskSeconds : 0}
            onScanToStart={() => handleScanToStart(currentTask)}
            onScanToFinish={() => handleScanToFinish(currentTask)}
            onCannotPerform={() => setShowCannotPerform(true)}
            onTap={() => {}}
          />
        )}

        {nextTask && (
          <LiveTaskTile
            task={nextTask}
            isCurrent={false}
            isActive={false}
            orderNumber={currentIdx + 2}
            totalTasks={tasks.length}
          />
        )}

        {thirdTask && (
          <LiveTaskTile
            task={thirdTask}
            isCurrent={false}
            isActive={false}
            orderNumber={currentIdx + 3}
            totalTasks={tasks.length}
          />
        )}

        <MyPointsWidget />
        <div className="h-20" />
      </div>

      {/* Fixed bottom action banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 flex items-center justify-around gap-2 z-40">
        <button
          onClick={() => setOnBreak(true)}
          className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-primary/10 transition-colors"
        >
          <Coffee size={20} className="text-primary" />
          <span className="text-[10px] font-medium text-primary">{t("worker.breakButton")}</span>
        </button>
        <button
          onClick={() => setScreen("shortage")}
          className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-warning/10 transition-colors"
        >
          <PackageOpen size={20} className="text-warning" />
          <span className="text-[10px] font-medium text-warning">חוסרים</span>
        </button>
      </div>
    </div>
  );
};

export default StaffView;
