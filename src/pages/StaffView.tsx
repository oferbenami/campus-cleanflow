import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  MapPin,
  LogOut,
  Loader2,
  LayoutGrid,
  Trophy,
  Calendar,
  Wrench as WrenchIcon,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";
import { useStaffAssignment } from "@/hooks/useStaffAssignment";
import LiveTaskTile, { getEscalationLevel } from "@/components/staff/LiveTaskTile";
import NfcScanSimulator from "@/components/staff/NfcScanSimulator";
import EndOfDayAnalysis from "@/components/staff/EndOfDayAnalysis";
import MyPointsWidget from "@/components/staff/MyPointsWidget";
import DeferTaskModal from "@/components/staff/DeferTaskModal";
import type { DeferResult } from "@/components/staff/DeferTaskModal";
import ShortageReportScreen from "@/components/staff/ShortageReportScreen";
import FullTaskBoard from "@/components/staff/FullTaskBoard";
import BreakFixReportScreen from "@/components/staff/BreakFixReportScreen";
import UpcomingShifts from "@/components/staff/UpcomingShifts";
import AbsenceReportScreen from "@/components/staff/AbsenceReportScreen";
import { useShortageReports } from "@/hooks/useShortageReports";
import { useIncidents } from "@/hooks/useIncidents";
import IncidentTaskTile from "@/components/staff/IncidentTaskTile";
import breakIllustration from "@/assets/break-illustration.png";

type StaffScreen = "welcome" | "home" | "taskDetail" | "analysis" | "shortage" | "taskBoard" | "shifts" | "absence" | "points" | "breakfix";
type ScanMode = { type: "entry" | "exit"; taskId: string; expectedUid: string | null; locationName: string } | null;

const StaffView = () => {
  const { t } = useI18n();
  const { signOut, user } = useAuth();
  const { assignment, tasks, loading, error, startTask, finishTask, deferTask, resumeTask, pauseTaskForIncident, resumePausedTask, sendSlaAlert } = useStaffAssignment();
  const { submitShortageReport } = useShortageReports();
  const { myIncidents, myResolvedCount, startIncident, resolveIncident, reassignIncident, createIncident } = useIncidents();
  const [shortageSubmitting, setShortageSubmitting] = useState(false);
  const [breakfixSubmitting, setBreakfixSubmitting] = useState(false);

  const [screen, setScreen] = useState<StaffScreen>("welcome");
  const [scanMode, setScanMode] = useState<ScanMode>(null);
  const [onBreak, setOnBreak] = useState(false);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [totalBreakSeconds, setTotalBreakSeconds] = useState(0);
  const [taskSeconds, setTaskSeconds] = useState(0);
  const [taskBreakAccum, setTaskBreakAccum] = useState(0);
  const [breakStartedAt, setBreakStartedAt] = useState<number | null>(null);
  const [breakCount, setBreakCount] = useState(0);
  const [showDeferModal, setShowDeferModal] = useState(false);
  // Equipment prep tracking
  const [onEquipPrep, setOnEquipPrep] = useState(false);
  const [equipPrepSeconds, setEquipPrepSeconds] = useState(0);
  const [totalEquipPrepSeconds, setTotalEquipPrepSeconds] = useState(0);
  const [equipPrepCount, setEquipPrepCount] = useState(0);

  const currentTask = tasks.find((t) => t.status === "in_progress") 
    || tasks.find((t) => t.status === "queued" || t.status === "ready")
    || tasks.find((t) => t.status === "deferred");
  const isActive = currentTask?.status === "in_progress";
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const allDone = tasks.length > 0 && tasks.every((t) => ["completed", "failed", "missed"].includes(t.status));

  const currentIdx = currentTask ? tasks.indexOf(currentTask) : -1;
  const nextTask = currentIdx >= 0 && currentIdx < tasks.length - 1 ? tasks[currentIdx + 1] : null;
  const thirdTask = currentIdx >= 0 && currentIdx < tasks.length - 2 ? tasks[currentIdx + 2] : null;

  // Task timer — subtracts accumulated break time
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && !onBreak && currentTask?.started_at) {
      const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - new Date(currentTask.started_at!).getTime()) / 1000);
        setTaskSeconds(elapsed - taskBreakAccum);
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, onBreak, currentTask?.started_at, taskBreakAccum]);

  // Break timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (onBreak) {
      interval = setInterval(() => setBreakSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [onBreak]);

  // Equipment prep timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (onEquipPrep) {
      interval = setInterval(() => setEquipPrepSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [onEquipPrep]);

  // SLA Escalation
  const slaAlertSent = useRef(false);
  const audioPlayed = useRef(false);

  useEffect(() => {
    if (!currentTask || !isActive) return;
    const elapsedMin = taskSeconds / 60;
    const standard = currentTask.standard_minutes;
    if (elapsedMin >= standard * 1.15 && !slaAlertSent.current) {
      slaAlertSent.current = true;
      sendSlaAlert(currentTask.id, Math.floor(elapsedMin));
      toast({ title: "⚠️ חריגה מעל 15%", description: `${currentTask.location_name} — המפקח קיבל התראה`, variant: "destructive" });
    }
    if (elapsedMin >= standard * 1.25 && !audioPlayed.current) {
      audioPlayed.current = true;
      playAlertSound();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }, [taskSeconds, currentTask, isActive, sendSlaAlert]);

  useEffect(() => { slaAlertSent.current = false; audioPlayed.current = false; setTaskBreakAccum(0); }, [currentTask?.id]);

  const playAlertSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.5);
    } catch {}
  };

  // Handlers
  const handleScanToStart = (task: typeof currentTask) => {
    if (!task) return;
    // Block starting a regular task if an incident is in progress
    const incidentInProgress = myIncidents.some(i => i.status === "in_progress");
    if (incidentInProgress) {
      toast({ title: "⚠️ לא ניתן להתחיל משימה", description: "יש לסיים את הטיפול בתקלה קודם", variant: "destructive" });
      return;
    }
    setScanMode({ type: "entry", taskId: task.id, expectedUid: task.location_nfc_tag_uid, locationName: task.location_name });
  };

  const handleScanToFinish = (task: typeof currentTask) => {
    if (!task) return;
    setScanMode({ type: "exit", taskId: task.id, expectedUid: task.location_nfc_tag_uid, locationName: task.location_name });
  };

  const handleScanResult = useCallback(async (tagUid: string, isMatch: boolean) => {
    if (!scanMode) return;
    if (!isMatch) {
      if (tagUid !== "") toast({ title: "מיקום לא תואם!", description: "התג שנסרק לא מתאים למיקום המשימה", variant: "destructive" });
      setScanMode(null); return;
    }
    try {
      if (scanMode.type === "entry") { await startTask(scanMode.taskId, tagUid); setTaskSeconds(0); toast({ title: "✓ משימה התחילה!" }); }
      else { await finishTask(scanMode.taskId, tagUid); setTaskSeconds(0); toast({ title: "✓ משימה הושלמה! המשימה הבאה נטענה." }); }
    } catch (err: any) { toast({ title: "שגיאה", description: err.message, variant: "destructive" }); }
    setScanMode(null);
  }, [scanMode, startTask, finishTask]);

  const handleDeferTask = async (result: DeferResult) => {
    if (!currentTask) return;
    try {
      await deferTask(currentTask.id, result.reasonCode, result.reasonLabel, result.note, result.action);
      const actionMsg = result.action === "defer_swap" ? "המשימה הוחלפה עם המשימה הבאה" : "המשימה הועברה לסוף התור";
      toast({ title: "⏸ משימה נדחתה", description: actionMsg });
    } catch (err: any) { toast({ title: "שגיאה", description: err.message, variant: "destructive" }); }
    setShowDeferModal(false);
  };

  // Loading
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
          <div className="flex flex-col gap-2 items-center">
            <button onClick={() => setScreen("shifts")} className="flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20">
              <Calendar size={16} /> צפה בשיבוצים הקרובים
            </button>
            <button onClick={signOut} className="flex items-center justify-center gap-2 py-3 px-6 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted">
              <LogOut size={16} /> התנתק
            </button>
          </div>
        </div>
        {screen === "shifts" && <div className="fixed inset-0 z-50"><UpcomingShifts onClose={() => setScreen("home")} onReportAbsence={() => setScreen("absence")} /></div>}
        {screen === "absence" && <div className="fixed inset-0 z-50"><AbsenceReportScreen onClose={() => setScreen("shifts")} /></div>}
      </div>
    );
  }

  // Full-screen sub-screens
  if (screen === "welcome") {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "בוקר טוב" : hour < 17 ? "צהריים טובים" : "ערב טוב";
    const greetingEmoji = hour < 12 ? "☀️" : hour < 17 ? "🌤️" : "🌙";
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-8">
          <div className="animate-fade-in">
            <p className="text-6xl mb-4">{greetingEmoji}</p>
            <h1 className="text-4xl font-black text-foreground mb-2">{greeting}{assignment.staff_name ? `, ${assignment.staff_name}` : ""}!</h1>
            <p className="text-lg text-muted-foreground">שמחים שהגעת למשמרת</p>
          </div>
          <div className="bg-primary/10 border-2 border-primary/20 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-center gap-2 text-primary">
              <MapPin size={22} />
              <p className="text-lg font-bold">{tasks.length} משימות מתוכננות</p>
            </div>
            <p className="text-sm text-muted-foreground">משמרת {assignment.shift_type === "morning" ? "בוקר" : "ערב"}</p>
          </div>
          <p className="text-3xl font-black text-primary">בהצלחה! 💪</p>
          <button onClick={() => setScreen("home")} className="btn-action-primary w-full flex items-center justify-center gap-3 text-lg py-4">
            <Play size={22} /> יאללה, מתחילים
          </button>
        </div>
      </div>
    );
  }

  if (screen === "shortage") {
    return (
      <ShortageReportScreen
        onClose={() => setScreen("home")}
        submitting={shortageSubmitting}
        onSubmit={async (items, location, category) => {
          setShortageSubmitting(true);
          try { await submitShortageReport(items, location, category); toast({ title: "✓ דיווח חוסרים נשלח!" }); setScreen("home"); }
          catch (err: any) { toast({ title: "שגיאה", description: err.message, variant: "destructive" }); }
          setShortageSubmitting(false);
        }}
      />
    );
  }

  if (screen === "breakfix") {
    return (
      <BreakFixReportScreen
        onClose={() => setScreen("home")}
        submitting={breakfixSubmitting}
        currentLocationId={currentTask?.location_id}
        currentLocationName={currentTask?.location_name}
        onSubmit={async (params) => {
          setBreakfixSubmitting(true);
          try {
            await createIncident({
              locationId: params.locationId,
              description: params.description,
              priority: params.priority,
              category: params.category,
              assignToUserId: params.selfAssign ? user?.id : undefined,
              photoUrl: params.photoUrl,
            });
            toast({ title: "✓ דיווח תקלה נשלח!", description: params.selfAssign ? "התקלה שובצה אליך" : "המפקח והמנהל קיבלו התראה" });
            setScreen("home");
          } catch (err: any) {
            toast({ title: "שגיאה", description: err.message, variant: "destructive" });
          }
          setBreakfixSubmitting(false);
        }}
      />
    );
  }

  if (screen === "analysis") return <EndOfDayAnalysis tasks={tasks} resolvedIncidentCount={myResolvedCount} totalBreakMinutes={Math.round(totalBreakSeconds / 60)} breakCount={breakCount} totalEquipPrepMinutes={Math.round(totalEquipPrepSeconds / 60)} equipPrepCount={equipPrepCount} onClose={() => setScreen("home")} />;
  if (screen === "taskBoard") return <FullTaskBoard tasks={tasks} onClose={() => setScreen("home")} onResumeTask={async (taskId) => {
    try { await resumeTask(taskId); toast({ title: "✓ המשימה חזרה לתור" }); setScreen("home"); } catch (err: any) { toast({ title: "שגיאה", description: err.message, variant: "destructive" }); }
  }} />;
  if (screen === "shifts") return <UpcomingShifts onClose={() => setScreen("home")} onReportAbsence={() => setScreen("absence")} />;
  if (screen === "absence") return <AbsenceReportScreen onClose={() => setScreen("home")} />;
  if (screen === "points") return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">הנקודות שלי</h1>
        <button onClick={() => setScreen("home")} className="p-1.5 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20">
          <span className="text-sm">✕</span>
        </button>
      </header>
      <div className="flex-1 p-4"><MyPointsWidget /></div>
    </div>
  );

  // Break screen
  if (onBreak) {
    const breakTimeDisplay = `${String(Math.floor(breakSeconds / 60)).padStart(2, "0")}:${String(breakSeconds % 60).padStart(2, "0")}`;
    const totalDisplay = `${String(Math.floor(totalBreakSeconds / 60)).padStart(2, "0")}:${String(totalBreakSeconds % 60).padStart(2, "0")}`;
    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
          <img src={breakIllustration} alt="הפסקה" className="w-28 h-28 object-contain rounded-2xl opacity-90" />
          <h1 className="text-2xl font-black text-foreground">{t("worker.onBreakTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("worker.onBreakSubtitle")}</p>
          <div className="bg-primary/10 border-2 border-primary/20 rounded-2xl px-6 py-3">
            <p className="text-[10px] text-muted-foreground mb-1">הפסקה נוכחית</p>
            <div className="flex items-center justify-center gap-2">
              <Timer size={20} className="text-primary" />
              <span className="mono text-4xl font-black text-foreground">{breakTimeDisplay}</span>
            </div>
          </div>
          {totalBreakSeconds > 0 && (
            <div className="bg-muted/40 rounded-xl px-4 py-2">
              <p className="text-[10px] text-muted-foreground">סה״כ הפסקות היום</p>
              <p className="text-lg font-bold text-foreground">{totalDisplay}</p>
            </div>
          )}
        </div>
        <div className="px-6 pb-6 pt-2">
          <button onClick={() => { setTotalBreakSeconds(prev => prev + breakSeconds); setTaskBreakAccum(prev => prev + breakSeconds); setOnBreak(false); setBreakSeconds(0); setBreakStartedAt(null); }} className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-colors">
            <Play size={22} /> {t("worker.backToWork")}
          </button>
        </div>
      </div>
    );
  }

  // Equipment prep screen
  if (onEquipPrep) {
    const prepTimeDisplay = `${String(Math.floor(equipPrepSeconds / 60)).padStart(2, "0")}:${String(equipPrepSeconds % 60).padStart(2, "0")}`;
    const totalPrepDisplay = `${String(Math.floor(totalEquipPrepSeconds / 60)).padStart(2, "0")}:${String(totalEquipPrepSeconds % 60).padStart(2, "0")}`;
    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
          <div className="w-28 h-28 rounded-2xl bg-accent/20 flex items-center justify-center">
            <WrenchIcon size={48} className="text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-black text-foreground">סידור ציוד ועגלה</h1>
          <p className="text-sm text-muted-foreground">הטיימר רץ — קח את הזמן לסדר הכל</p>
          <div className="bg-accent/10 border-2 border-accent/20 rounded-2xl px-6 py-3">
            <p className="text-[10px] text-muted-foreground mb-1">זמן סידור נוכחי</p>
            <div className="flex items-center justify-center gap-2">
              <Timer size={20} className="text-accent-foreground" />
              <span className="mono text-4xl font-black text-foreground">{prepTimeDisplay}</span>
            </div>
          </div>
          {totalEquipPrepSeconds > 0 && (
            <div className="bg-muted/40 rounded-xl px-4 py-2">
              <p className="text-[10px] text-muted-foreground">סה״כ סידור ציוד היום</p>
              <p className="text-lg font-bold text-foreground">{totalPrepDisplay}</p>
            </div>
          )}
        </div>
        <div className="px-6 pb-6 pt-2">
          <button onClick={() => { setTotalEquipPrepSeconds(prev => prev + equipPrepSeconds); setTaskBreakAccum(prev => prev + equipPrepSeconds); setOnEquipPrep(false); setEquipPrepSeconds(0); }} className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-colors">
            <Play size={22} /> סיימתי, חזרה לעבודה
          </button>
        </div>
      </div>
    );
  }

  // All done
  if (allDone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="text-center animate-slide-up mb-6">
          <CheckCircle2 className="mx-auto mb-4 text-success" size={64} />
          <h1 className="text-2xl font-bold mb-2">{t("worker.allDone")}</h1>
          <p className="text-muted-foreground">{t("worker.greatWork")}</p>
        </div>
        <button onClick={() => setScreen("analysis")} className="btn-action-primary flex items-center justify-center gap-3 w-full max-w-xs">
          <BarChart3 size={20} /> {t("worker.endOfDay")}
        </button>
        <button onClick={signOut} className="flex items-center justify-center gap-2 w-full max-w-xs mt-3 py-3 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted">
          <LogOut size={16} /> התנתק
        </button>
      </div>
    );
  }

  // Active incident (shown inline in task list, not as overlay)
  const activeIncident = myIncidents[0] || null;

  // HOME SCREEN
  const scanModal = scanMode && (
    <NfcScanSimulator expectedTagUid={scanMode.expectedUid} onScanResult={handleScanResult} mode={scanMode.type} locationName={scanMode.locationName} />
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {scanModal}

      {showDeferModal && currentTask && (
        <DeferTaskModal
          task={currentTask}
          nextTask={nextTask && ["queued", "ready"].includes(nextTask.status) ? nextTask : null}
          deferCount={currentTask.defer_count || 0}
          onSubmit={handleDeferTask}
          onCancel={() => setShowDeferModal(false)}
        />
      )}

      {/* Header with action buttons */}
      <header className="bg-primary text-primary-foreground px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs opacity-75 uppercase tracking-wider" style={{ fontFamily: "'Heebo', sans-serif" }}>CleanFlow</p>
            <h1 className="text-lg font-extrabold" style={{ fontFamily: "'Heebo', sans-serif" }}>{t("worker.homeTitle")}</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="text-left mr-1">
              <p className="text-xs opacity-75">{completedCount}/{tasks.length}</p>
            </div>
            <button onClick={signOut} className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
        {/* Quick action buttons row */}
        <div className="flex gap-1.5 -mx-1">
          <button onClick={() => setScreen("points")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
            <Trophy size={14} />
            <span className="text-[11px] font-medium">נקודות</span>
          </button>
          <button onClick={() => setScreen("taskBoard")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
            <LayoutGrid size={14} />
            <span className="text-[11px] font-medium">כל המשימות</span>
          </button>
          <button onClick={() => setScreen("shifts")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
            <Calendar size={14} />
            <span className="text-[11px] font-medium">שיבוצים</span>
          </button>
          <button onClick={() => setScreen("analysis")} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
            <BarChart3 size={14} />
            <span className="text-[11px] font-medium">סיכום</span>
          </button>
        </div>
      </header>

      {/* Progress pips */}
      <div className="px-4 py-3 flex gap-1.5">
        {tasks.map((t) => (
          <div key={t.id} className={`h-1.5 flex-1 rounded-full transition-colors ${
            t.status === "completed" ? "bg-success" :
            t.status === "in_progress" ? "bg-accent animate-pulse-slow" :
            t.status === "failed" || t.status === "missed" ? "bg-destructive" :
            t.status === "deferred" || t.status === "paused" ? "bg-warning" :
            t.status === "blocked" ? "bg-warning" :
            "bg-muted"
          }`} />
        ))}
      </div>

      {/* Task Tiles */}
      <div className="flex-1 px-4 pb-4 flex flex-col gap-3">
        {/* Incident tile at top - flashing red */}
        {activeIncident && (activeIncident.status === "assigned" || activeIncident.status === "in_progress") && (
          <IncidentTaskTile
            incident={activeIncident}
            onAccept={async () => {
              const activeTask = tasks.find(t => t.status === "in_progress");
              if (activeTask) {
                await pauseTaskForIncident(activeTask.id);
                toast({ title: "⏸ משימה הושהתה", description: `${activeTask.task_name} הושהתה לטובת טיפול בתקלה` });
              }
              await startIncident(activeIncident.id);
              toast({ title: "✓ התחלת טיפול בתקלה" });
            }}
            onStart={async () => {
              const activeTask = tasks.find(t => t.status === "in_progress");
              if (activeTask) {
                await pauseTaskForIncident(activeTask.id);
              }
              await startIncident(activeIncident.id);
              toast({ title: "✓ התחלת טיפול בתקלה" });
            }}
            onResolve={async () => {
              await resolveIncident(activeIncident.id);
              toast({ title: "✓ תקלה טופלה בהצלחה!" });
              await resumePausedTask();
            }}
            onDefer={async (reason) => {
              await supabase.from("incident_events_log").insert({ incident_id: activeIncident.id, event_type: "deferred" as any, user_id: user?.id || "", event_payload: { reason } });
              await supabase.from("incidents").update({ assigned_to_user_id: null, status: "pending_dispatch" as any, assigned_at: null }).eq("id", activeIncident.id);
              toast({ title: "⚠️ תקלה הוחזרה לתור" });
              await resumePausedTask();
            }}
          />
        )}

        {currentTask && (
          <LiveTaskTile
            task={currentTask} isCurrent={true} isActive={isActive}
            orderNumber={currentIdx + 1} totalTasks={tasks.length}
            elapsedSeconds={isActive ? taskSeconds : 0}
            onScanToStart={() => handleScanToStart(currentTask)}
            onScanToFinish={() => handleScanToFinish(currentTask)}
            onDeferTask={() => setShowDeferModal(true)}
            onTap={() => {}}
          />
        )}
        {nextTask && (
          <LiveTaskTile task={nextTask} isCurrent={false} isActive={false} orderNumber={currentIdx + 2} totalTasks={tasks.length} />
        )}
        {thirdTask && (
          <LiveTaskTile task={thirdTask} isCurrent={false} isActive={false} orderNumber={currentIdx + 3} totalTasks={tasks.length} />
        )}
        <div className="h-20" />
      </div>

      {/* Fixed bottom action banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 flex items-center justify-around gap-2 z-40">
        <button onClick={() => { setOnBreak(true); setBreakStartedAt(Date.now()); setBreakCount(c => c + 1); }} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-primary/10 transition-colors">
          <Coffee size={20} className="text-primary" />
          <span className="text-[10px] font-medium text-primary">{t("worker.breakButton")}</span>
        </button>
        <button onClick={() => { setOnEquipPrep(true); setEquipPrepCount(c => c + 1); }} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-accent/10 transition-colors">
          <WrenchIcon size={20} className="text-accent-foreground" />
          <span className="text-[10px] font-medium text-accent-foreground">ציוד</span>
        </button>
        <button onClick={() => setScreen("breakfix")} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-destructive/10 transition-colors">
          <AlertTriangle size={20} className="text-destructive" />
          <span className="text-[10px] font-medium text-destructive">תקלה</span>
        </button>
        <button onClick={() => setScreen("shortage")} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-warning/10 transition-colors">
          <PackageOpen size={20} className="text-warning" />
          <span className="text-[10px] font-medium text-warning">חוסרים</span>
        </button>
      </div>
    </div>
  );
};

export default StaffView;
