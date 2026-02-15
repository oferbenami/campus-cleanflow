import { useState, useEffect } from "react";
import {
  Play,
  Square,
  AlertTriangle,
  Coffee,
  MapPin,
  Clock,
  ChevronRight,
  PackageOpen,
  CheckCircle2,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { mockAssignments, mockTasks, type TaskAssignment } from "@/data/mockData";

const StaffView = () => {
  // Simulate current staff = Sarah Cohen (s1)
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

  const current = staffAssignments[currentIndex];
  const completedCount = staffAssignments.filter((a) => a.status === "completed").length;
  const totalCount = staffAssignments.length;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && !onBreak) {
      interval = setInterval(() => setElapsed((e) => e + 1), 60000);
    }
    return () => clearInterval(interval);
  }, [isRunning, onBreak]);

  const handleStart = () => setIsRunning(true);
  const handleFinish = () => {
    setIsRunning(false);
    setElapsed(0);
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

  if (allDone || !current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center animate-slide-up">
          <CheckCircle2 className="mx-auto mb-4 text-success" size={64} />
          <h1 className="text-2xl font-bold mb-2">All Tasks Completed!</h1>
          <p className="text-muted-foreground">Great work today, Sarah.</p>
        </div>
      </div>
    );
  }

  const progressPercent = Math.min((elapsed / current.task.estimatedMinutes) * 100, 100);
  const isOverdue = elapsed > current.task.estimatedMinutes * 1.15;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs opacity-75 uppercase tracking-wider">CleanFlow</p>
          <h1 className="text-lg font-bold">Sarah Cohen</h1>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-75">Progress</p>
          <p className="text-lg font-bold mono">
            {completedCount}/{totalCount}
          </p>
        </div>
      </header>

      {/* Task progress steps */}
      <div className="px-4 py-3 flex gap-1.5">
        {staffAssignments.map((a, i) => (
          <div
            key={a.id}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              a.status === "completed"
                ? "bg-success"
                : i === currentIndex
                ? isRunning
                  ? "bg-accent animate-pulse-slow"
                  : "bg-accent"
                : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Current Task Card */}
      <div className="flex-1 px-4 pb-4 flex flex-col gap-4">
        <div className={`task-card flex-1 animate-slide-up ${isOverdue ? 'border-destructive border-2' : ''}`}>
          {/* Task type badge */}
          <div className="flex items-center justify-between mb-4">
            <span
              className={`status-badge ${
                current.task.type === "maintenance"
                  ? "bg-info/15 text-info"
                  : "bg-accent/15 text-accent-foreground"
              }`}
            >
              {current.task.type === "maintenance" ? "Quick Clean" : "Deep Clean"}
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Task {currentIndex + 1} of {totalCount}
            </span>
          </div>

          {/* Room info */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MapPin size={14} />
              <span className="text-sm">
                Wing {current.task.zone.wing} · Floor {current.task.zone.floor}
              </span>
            </div>
            <h2 className="text-2xl font-bold">{current.task.zone.name}</h2>
            <p className="text-muted-foreground mt-1">{current.task.name}</p>
          </div>

          {/* Timer */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Timer size={16} className={isOverdue ? 'text-destructive' : 'text-muted-foreground'} />
                <span className={`mono text-sm font-medium ${isOverdue ? 'text-destructive' : ''}`}>
                  {elapsed} min / {current.task.estimatedMinutes} min
                </span>
              </div>
              {isOverdue && (
                <span className="status-badge status-overdue">OVERDUE</span>
              )}
            </div>
            <Progress
              value={progressPercent}
              className={`h-3 ${isOverdue ? '[&>div]:bg-destructive' : '[&>div]:bg-success'}`}
            />
          </div>

          {/* Break toggle */}
          {isRunning && (
            <button
              onClick={() => setOnBreak(!onBreak)}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-colors mb-4 ${
                onBreak
                  ? "bg-accent/15 border-accent text-accent-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <Coffee size={16} />
              {onBreak ? "Resume Work" : "Take Break"}
            </button>
          )}

          {/* Stock low toggles */}
          {isRunning && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <PackageOpen size={12} />
                Stock Check
              </p>
              <div className="flex flex-wrap gap-2">
                {["Soap", "Paper Towels", "Sanitizer", "Trash Bags"].map((item) => (
                  <button
                    key={item}
                    onClick={() => toggleStock(item)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      stockLowItems.includes(item)
                        ? "bg-warning/15 border-warning text-warning-foreground"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {stockLowItems.includes(item) ? "⚠ " : ""}
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {!isRunning ? (
            <button onClick={handleStart} className="btn-action-success w-full flex items-center justify-center gap-3">
              <Play size={24} />
              START
            </button>
          ) : (
            <button onClick={handleFinish} className="btn-action-primary w-full flex items-center justify-center gap-3">
              <Square size={24} />
              FINISH
            </button>
          )}

          <button
            onClick={() => setShowIssuePanel(!showIssuePanel)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-destructive text-destructive font-bold transition-colors hover:bg-destructive/10"
          >
            <AlertTriangle size={20} />
            Report Issue
          </button>
        </div>

        {/* Issue panel */}
        {showIssuePanel && (
          <div className="task-card animate-slide-up space-y-2">
            <p className="font-semibold text-sm mb-3">Select Issue Type:</p>
            {["Spill / Wet Floor", "Leak / Plumbing", "Broken Equipment", "Safety Hazard", "Other"].map(
              (issue) => (
                <button
                  key={issue}
                  onClick={() => setShowIssuePanel(false)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors flex items-center justify-between"
                >
                  <span className="text-sm font-medium">{issue}</span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffView;
