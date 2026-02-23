import { useState } from "react";
import { XCircle, Camera, ArrowLeftRight, ArrowDownToLine, AlertTriangle, Lock, ShieldAlert, Wrench, HelpCircle, MessageSquare } from "lucide-react";
import type { AssignedTaskRow } from "@/hooks/useStaffAssignment";

export interface CannotPerformResult {
  reason: string;
  reasonCode: string;
  note: string;
  action: "defer_swap" | "defer_end" | "block";
}

interface CannotPerformModalProps {
  task: AssignedTaskRow;
  nextTask: AssignedTaskRow | null;
  onSubmit: (result: CannotPerformResult) => void;
  onCancel: () => void;
}

const REASON_CODES = [
  { code: "occupied", label: "מיקום לא פנוי / תפוס", icon: <Lock size={18} /> },
  { code: "locked", label: "גישה חסומה / נעול", icon: <Lock size={18} /> },
  { code: "safety", label: "סכנה בטיחותית", icon: <ShieldAlert size={18} /> },
  { code: "equipment", label: "ציוד חסר", icon: <Wrench size={18} /> },
  { code: "not_in_scope", label: "לא בהיקף / הוראות לא ברורות", icon: <HelpCircle size={18} /> },
  { code: "other", label: "אחר", icon: <MessageSquare size={18} /> },
];

const CannotPerformModal = ({ task, nextTask, onSubmit, onCancel }: CannotPerformModalProps) => {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"reason" | "defer_choice">("reason");

  const selectedReason = REASON_CODES.find((r) => r.code === selectedCode);
  const isOccupied = selectedCode === "occupied";
  const requiresNote = selectedCode === "other";

  const handleSelectReason = (code: string) => {
    setSelectedCode(code);
  };

  const handleContinue = () => {
    if (!selectedCode) return;
    if (isOccupied && nextTask) {
      setStep("defer_choice");
    } else {
      // Non-occupied reasons -> block the task
      onSubmit({
        reason: selectedReason?.label || "",
        reasonCode: selectedCode,
        note,
        action: "block",
      });
    }
  };

  const handleDeferChoice = (action: "defer_swap" | "defer_end") => {
    // Check if next task has a fixed time window that would conflict
    if (action === "defer_swap" && nextTask?.window_start) {
      const windowStart = new Date(nextTask.window_start);
      const now = new Date();
      // If window_start is in the future and more than 30 minutes away, warn
      if (windowStart.getTime() > now.getTime() + 30 * 60000) {
        // Still allow but the UI shows a note
      }
    }

    onSubmit({
      reason: selectedReason?.label || "",
      reasonCode: selectedCode!,
      note,
      action,
    });
  };

  if (step === "defer_choice") {
    const hasTimeWindow = nextTask?.window_start && nextTask?.window_end;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onCancel}>
        <div className="w-full max-w-sm bg-card border border-border rounded-t-2xl sm:rounded-2xl p-5 animate-slide-up space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle size={22} />
            <h3 className="font-bold text-lg">מיקום תפוס</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            <strong>{task.location_name}</strong> — בחר מה לעשות:
          </p>

          {/* Option A: Swap */}
          {nextTask && (
            <button
              onClick={() => handleDeferChoice("defer_swap")}
              className="w-full flex items-start gap-3 p-4 rounded-xl border-2 border-info/30 bg-info/5 hover:bg-info/10 transition-colors text-right"
            >
              <ArrowLeftRight size={24} className="text-info shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">החלף עם המשימה הבאה</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  עבור ל-<strong>{nextTask.location_name}</strong> ({nextTask.standard_minutes} דק׳) וחזור למשימה זו אחר כך
                </p>
                {hasTimeWindow && (
                  <p className="text-xs text-warning mt-1 flex items-center gap-1">
                    <AlertTriangle size={10} /> למשימה הבאה יש חלון זמן קבוע
                  </p>
                )}
              </div>
            </button>
          )}

          {/* Option B: Skip to end */}
          <button
            onClick={() => handleDeferChoice("defer_end")}
            className="w-full flex items-start gap-3 p-4 rounded-xl border-2 border-border hover:bg-muted/30 transition-colors text-right"
          >
            <ArrowDownToLine size={24} className="text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">דלג לסוף התור</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                המשימה תעבור לסוף הרשימה. חובה להשלים אותה היום.
              </p>
            </div>
          </button>

          <button onClick={onCancel} className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            ביטול
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onCancel}>
      <div className="w-full max-w-sm bg-card border border-border rounded-t-2xl sm:rounded-2xl p-5 animate-slide-up space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-destructive">
          <XCircle size={22} />
          <h3 className="font-bold text-lg">לא ניתן לבצע</h3>
        </div>

        <div className="text-sm text-muted-foreground">
          <strong>{task.task_name}</strong> — {task.location_name}
        </div>

        {/* Reason codes */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">בחר סיבה</p>
          {REASON_CODES.map((reason) => (
            <button
              key={reason.code}
              onClick={() => handleSelectReason(reason.code)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors text-right min-h-[48px] ${
                selectedCode === reason.code
                  ? "border-destructive bg-destructive/5"
                  : "border-border hover:bg-muted/30"
              }`}
            >
              <span className={selectedCode === reason.code ? "text-destructive" : "text-muted-foreground"}>
                {reason.icon}
              </span>
              <span className={`text-sm font-medium ${selectedCode === reason.code ? "text-foreground" : "text-muted-foreground"}`}>
                {reason.label}
              </span>
            </button>
          ))}
        </div>

        {/* Note field */}
        {selectedCode && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">
              {requiresNote ? "הערה (חובה)" : "הערה (אופציונלי)"}
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="תאר בקצרה..."
              className="w-full h-20 px-3 py-2 rounded-xl border border-border bg-muted/30 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-destructive/50"
              dir="rtl"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted min-h-[48px]">
            ביטול
          </button>
          <button
            onClick={handleContinue}
            disabled={!selectedCode || (requiresNote && !note.trim())}
            className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm hover:bg-destructive/90 disabled:opacity-50 min-h-[48px]"
          >
            שלח דיווח
          </button>
        </div>
      </div>
    </div>
  );
};

export default CannotPerformModal;
