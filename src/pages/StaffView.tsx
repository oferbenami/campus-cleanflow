import { useState, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import {
  Play,
  Square,
  AlertTriangle,
  Coffee,
  MapPin,
  ChevronLeft,
  PackageOpen,
  CheckCircle2,
  Timer,
  CalendarDays,
  BarChart3,
  Zap,
  Image,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { mockAssignments, type TaskAssignment } from "@/data/mockData";
import { scheduledTimes } from "@/data/staffSchedule";
import NextTaskPreview from "@/components/staff/NextTaskPreview";
import PerformanceScore from "@/components/staff/PerformanceScore";
import DaySchedule from "@/components/staff/DaySchedule";
import EndOfDayAnalysis from "@/components/staff/EndOfDayAnalysis";

const stockItems = [
  { key: "Soap", label: "סבון" },
  { key: "Paper Towels", label: "מגבות נייר" },
  { key: "Sanitizer", label: "חומר חיטוי" },
  { key: "Trash Bags", label: "שקיות אשפה" },
];

const issueTypes = [
  "שפיכה / רצפה רטובה",
  "נזילה / אינסטלציה",
  "ציוד שבור",
  "סכנת בטיחות",
  "אחר",
];

type StaffScreen = "main" | "schedule" | "analysis";

const StaffView = () => {
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
  const [elapsed, setElapsed] = useState(
    staffAssignments[currentIndex]?.elapsedMinutes || 0
  );
  const [stockLowItems, setStockLowItems] = useState<string[]>([]);
  const [showIssuePanel, setShowIssuePanel] = useState(false);
  const [screen, setScreen] = useState<StaffScreen>("main");
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
  const completedCount = staffAssignments.filter((a) => a.status === "completed").length;
  const totalCount = staffAssignments.length;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && !onBreak) {
      interval = setInterval(() => {
        setElapsed((e) => e + 1);
        setTaskSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, onBreak]);

  const handleStart = () => {
    setIsRunning(true);
    setTaskSeconds(0);
  };
  const handleFinish = () => {
    setIsRunning(false);
    setElapsed(0);
    setTaskSeconds(0);
    setStockLowItems([]);
    if (currentIndex < staffAssignments.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setAllDone(true);
    }
  };

  const toggleStock = (item: string) => {
    setStockLowItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const overdueAlertSent = useRef(false);

  const taskElapsedMinutes = current ? Math.floor(taskSeconds / 60) : 0;
  const overdueThreshold = current ? Math.max(Math.round(current.task.estimatedMinutes * 0.15), 2) : 2;
  const isOverdue = current ? taskElapsedMinutes > current.task.estimatedMinutes + overdueThreshold : false;

  useEffect(() => {
    if (isOverdue && isRunning && !overdueAlertSent.current && current) {
      overdueAlertSent.current = true;
      toast({
        title: "⚠️ התראת חריגה נשלחה למנהל",
        description: `${current.task.zone.name} — חריגה של ${taskElapsedMinutes - current.task.estimatedMinutes} דק׳ מעל הזמן המתוכנן`,
        variant: "destructive",
      });
    }
  }, [isOverdue, isRunning]);

  useEffect(() => {
    overdueAlertSent.current = false;
  }, [currentIndex]);

  if (screen === "schedule") {
    return <DaySchedule assignments={staffAssignments} currentIndex={currentIndex} onClose={() => setScreen("main")} />;
  }
  if (screen === "analysis") {
    return <EndOfDayAnalysis assignments={staffAssignments} onClose={() => setScreen("main")} />;
  }

  if (allDone || !current) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="text-center animate-slide-up mb-6">
          <CheckCircle2 className="mx-auto mb-4 text-success" size={64} />
          <h1 className="text-2xl font-bold mb-2">כל המשימות הושלמו!</h1>
          <p className="text-muted-foreground">עבודה מצוינת היום, שרה.</p>
        </div>
        <button onClick={() => setScreen("analysis")} className="btn-action-primary flex items-center justify-center gap-3 w-full max-w-xs">
          <BarChart3 size={20} />
          ניתוח סוף יום
        </button>
      </div>
    );
  }

  const progressPercent = Math.min((taskElapsedMinutes / current.task.estimatedMinutes) * 100, 100);
  const taskTimeDisplay = `${String(Math.floor(taskSeconds / 60)).padStart(2, "0")}:${String(taskSeconds % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs opacity-75 uppercase tracking-wider">CleanFlow</p>
          <h1 className="text-lg font-bold">שרה כהן</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen("schedule")} className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors" title="סדר יום">
            <CalendarDays size={18} />
          </button>
          <button onClick={() => setScreen("analysis")} className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors" title="ניתוח ביצועים">
            <BarChart3 size={18} />
          </button>
          <div className="text-left">
            <p className="text-xs opacity-75">התקדמות</p>
            <p className="text-lg font-bold mono">{completedCount}/{totalCount}</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-3 flex gap-1.5">
        {staffAssignments.map((a, i) => (
          <div key={a.id} className={`h-1.5 flex-1 rounded-full transition-colors ${
            a.status === "completed" ? "bg-success" :
            i === currentIndex ? (isRunning ? "bg-accent animate-pulse-slow" : "bg-accent") :
            a.isBreakFix ? "bg-warning" : "bg-muted"
          }`} />
        ))}
      </div>

      {(() => {
        const pendingBreakFix = staffAssignments.find((a) => a.isBreakFix && a.status !== "completed");
        if (!pendingBreakFix || breakFixStatus === "done") return null;
        return (
          <div className="mx-4 mb-3 bg-warning/15 border-2 border-warning rounded-xl px-4 py-4 animate-pulse-slow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-warning/25 flex items-center justify-center flex-shrink-0">
                <Zap size={28} className="text-warning" />
              </div>
              <div>
                <p className="text-xl font-black text-warning">טיפול מיידי נדרש!</p>
                <p className="text-sm text-warning/80">{pendingBreakFix.breakFixDescription || "משימת תקלה בעדיפות גבוהה"}</p>
              </div>
            </div>
            {breakFixStatus === "idle" ? (
              <button
                onClick={() => setBreakFixStatus("in_progress")}
                className="w-full py-3 rounded-xl bg-warning text-warning-foreground font-bold text-base flex items-center justify-center gap-2 hover:bg-warning/90 transition-colors"
              >
                <Play size={20} />
                התחל טיפול
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 py-2">
                  <Timer size={18} className="text-warning" />
                  <span className="text-2xl font-black mono text-warning">
                    {String(Math.floor(breakFixSeconds / 60)).padStart(2, "0")}:{String(breakFixSeconds % 60).padStart(2, "0")}
                  </span>
                </div>
                <button
                  onClick={() => setBreakFixStatus("done")}
                  className="w-full py-3 rounded-xl bg-success text-success-foreground font-bold text-base flex items-center justify-center gap-2 hover:bg-success/90 transition-colors"
                >
                  <CheckCircle2 size={20} />
                  סיום טיפול
                </button>
              </div>
            )}
          </div>
        );
      })()}

      <div className="px-4 mb-3">
        <PerformanceScore assignments={staffAssignments} />
      </div>

      <div className="flex-1 px-4 pb-4 flex flex-col gap-4">
        <div className={`task-card flex-1 animate-slide-up ${isOverdue ? 'border-destructive border-2' : current.isBreakFix ? 'border-warning border-2' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            {current.isBreakFix ? (
              <span className="status-badge bg-warning/15 text-warning flex items-center gap-1">
                <Zap size={14} />
                תקלה מיידית
              </span>
            ) : (
              <span className={`status-badge ${
                current.task.type === "maintenance" ? "bg-info/15 text-info" : "bg-accent/15 text-accent-foreground"
              }`}>
                {current.task.type === "maintenance" ? "ניקוי מהיר" : "ניקוי יסודי"}
              </span>
            )}
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              משימה {currentIndex + 1} מתוך {totalCount}
            </span>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MapPin size={14} />
              <span className="text-sm">אגף {current.task.zone.wing} · קומה {current.task.zone.floor}</span>
            </div>
            <h2 className="text-2xl font-bold">{current.task.zone.name}</h2>
            <p className="text-muted-foreground mt-1">
              {current.isBreakFix && current.breakFixDescription ? current.breakFixDescription : current.task.name}
            </p>
            {scheduledTimes[current.id] && (
              <p className="text-sm mono text-muted-foreground mt-1">
                מתוכנן: {scheduledTimes[current.id].plannedStart} – {scheduledTimes[current.id].plannedEnd}
              </p>
            )}
          </div>

          {/* Break-fix image */}
          {current.isBreakFix && current.breakFixImageUrl && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Image size={12} />
                תמונת תקלה מהמפקח
              </p>
              <img src={current.breakFixImageUrl} alt="תמונת תקלה" className="w-full h-48 object-cover rounded-lg border border-border" />
            </div>
          )}

          <div className={`mb-6 ${isOverdue ? 'bg-destructive/10 border border-destructive/30 rounded-xl p-3 animate-pulse-slow' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Timer size={16} className={isOverdue ? 'text-destructive' : isRunning ? 'text-success' : 'text-muted-foreground'} />
                <span className={`mono text-2xl font-bold ${isOverdue ? 'text-destructive' : isRunning ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {taskTimeDisplay}
                </span>
                <span className="text-xs text-muted-foreground">/ {current.task.estimatedMinutes} דק׳</span>
              </div>
              {isOverdue && (
                <span className="status-badge status-overdue flex items-center gap-1">
                  <AlertTriangle size={12} />
                  חריגה — נשלח למנהל
                </span>
              )}
            </div>
            <Progress value={progressPercent} className={`h-3 ${isOverdue ? '[&>div]:bg-destructive' : '[&>div]:bg-success'}`} />
          </div>

          {isRunning && (
            <button onClick={() => setOnBreak(!onBreak)} className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-colors mb-4 ${
              onBreak ? "bg-accent/15 border-accent text-accent-foreground" : "border-border text-muted-foreground hover:bg-muted"
            }`}>
              <Coffee size={16} />
              {onBreak ? "חזרה לעבודה" : "הפסקה"}
            </button>
          )}

          {isRunning && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <PackageOpen size={12} />
                בדיקת מלאי
              </p>
              <div className="flex flex-wrap gap-2">
                {stockItems.map(({ key, label }) => (
                  <button key={key} onClick={() => toggleStock(key)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    stockLowItems.includes(key)
                      ? "bg-warning/15 border-warning text-warning-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}>
                    {stockLowItems.includes(key) ? "⚠ " : ""}{label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {nextTask && !isRunning && <NextTaskPreview assignment={nextTask} />}

        <div className="space-y-3">
          {!isRunning ? (
            <button onClick={handleStart} className="btn-action-success w-full flex items-center justify-center gap-3">
              <Play size={24} />
              התחל
            </button>
          ) : (
            <button onClick={handleFinish} className="btn-action-primary w-full flex items-center justify-center gap-3">
              <Square size={24} />
              סיום
            </button>
          )}
          <button onClick={() => setShowIssuePanel(!showIssuePanel)} className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-destructive text-destructive font-bold transition-colors hover:bg-destructive/10">
            <AlertTriangle size={20} />
            דיווח על תקלה
          </button>
        </div>

        {showIssuePanel && (
          <div className="task-card animate-slide-up space-y-2">
            <p className="font-semibold text-sm mb-3">בחר סוג תקלה:</p>
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
};

export default StaffView;
