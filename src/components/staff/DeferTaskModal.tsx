import { useState } from "react";
import {
  PauseCircle, Lock, ShieldAlert, Wrench, HelpCircle, MessageSquare,
  AlertTriangle, ArrowLeftRight, ArrowDownToLine, Phone, Camera
} from "lucide-react";
import type { AssignedTaskRow } from "@/hooks/useStaffAssignment";

export interface DeferResult {
  reasonCode: string;
  reasonLabel: string;
  note: string;
  action: "defer_swap" | "defer_end";
  photoUrl?: string;
}

interface DeferTaskModalProps {
  task: AssignedTaskRow;
  nextTask: AssignedTaskRow | null;
  deferCount: number;
  onSubmit: (result: DeferResult) => void;
  onCancel: () => void;
}

const REASON_CODES = [
  { code: "occupied", label: "מיקום לא פנוי / תפוס", icon: <Lock size={18} /> },
  { code: "locked", label: "גישה חסומה / נעול", icon: <Lock size={18} /> },
  { code: "safety", label: "סכנה בטיחותית", icon: <ShieldAlert size={18} /> },
  { code: "equipment", label: "ציוד / חומרים חסרים", icon: <Wrench size={18} /> },
  { code: "incident", label: "נקראתי לאירוע דחוף (Break-Fix)", icon: <AlertTriangle size={18} /> },
  { code: "other", label: "אחר", icon: <MessageSquare size={18} /> },
];

const DeferTaskModal = ({ task, nextTask, deferCount, onSubmit, onCancel }: DeferTaskModalProps) => {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"reason" | "action">("reason");

  const selectedReason = REASON_CODES.find((r) => r.code === selectedCode);
  const isOccupied = selectedCode === "occupied";
  const requiresNote = selectedCode === "other";
  const needsEscalation = deferCount >= 2;
  const isCriticalLocation = task.location_space_type === "restroom" || task.location_space_type === "lobby" || task.priority === "high";

  const handleContinue = () => {
    if (!selectedCode) return;
    if (isOccupied && nextTask) {
      setStep("action");
    } else {
      // Non-occupied reasons → move to end only
      onSubmit({
        reasonCode: selectedCode,
        reasonLabel: selectedReason?.label || "",
        note,
        action: "defer_end",
      });
    }
  };

  const handleActionChoice = (action: "defer_swap" | "defer_end") => {
    onSubmit({
      reasonCode: selectedCode!,
      reasonLabel: selectedReason?.label || "",
      note,
      action,
    });
  };

  // Step 2: Action choice (swap vs end)
  if (step === "action") {
    const hasTimeWindow = nextTask?.window_start && nextTask?.window_end;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onCancel}>
        <div className="w-full max-w-sm bg-card border border-border rounded-t-2xl sm:rounded-2xl p-5 animate-slide-up space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 text-warning">
            <PauseCircle size={22} />
            <h3 className="font-bold text-lg">דחיית משימה — מיקום תפוס</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            <strong>{task.location_name}</strong> — בחר מה לעשות:
          </p>

          {needsEscalation && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive font-medium">
              <Phone size={14} />
              <span>דחייה חוזרת ({deferCount + 1}x) — ההתראה תועבר למפקח</span>
            </div>
          )}

          {/* Swap */}
          {nextTask && (
            <button
              onClick={() => handleActionChoice("defer_swap")}
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

          {/* End */}
          <button
            onClick={() => handleActionChoice("defer_end")}
            className="w-full flex items-start gap-3 p-4 rounded-xl border-2 border-border hover:bg-muted/30 transition-colors text-right"
          >
            <ArrowDownToLine size={24} className="text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">העבר לסוף התור</p>
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

  // Step 1: Reason selection
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onCancel}>
      <div className="w-full max-w-sm bg-card border border-border rounded-t-2xl sm:rounded-2xl p-5 animate-slide-up space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-warning">
          <PauseCircle size={22} />
          <h3 className="font-bold text-lg">דחיית / השהיית משימה</h3>
        </div>

        <div className="text-sm text-muted-foreground">
          <strong>{task.task_name}</strong> — {task.location_name}
        </div>

        {isCriticalLocation && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive font-medium">
            <AlertTriangle size={14} />
            <span>מיקום קריטי — דחייה תשלח התראה מיידית למפקח</span>
          </div>
        )}

        {needsEscalation && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/10 border border-warning/30 text-xs text-warning font-medium">
            <Phone size={14} />
            <span>דחייה חוזרת ({deferCount + 1}x) — נדרש אישור מפקח</span>
          </div>
        )}

        {/* Reason list */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">בחר סיבה</p>
          {REASON_CODES.map((reason) => (
            <button
              key={reason.code}
              onClick={() => setSelectedCode(reason.code)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors text-right min-h-[48px] ${
                selectedCode === reason.code
                  ? "border-warning bg-warning/5"
                  : "border-border hover:bg-muted/30"
              }`}
            >
              <span className={selectedCode === reason.code ? "text-warning" : "text-muted-foreground"}>
                {reason.icon}
              </span>
              <span className={`text-sm font-medium ${selectedCode === reason.code ? "text-foreground" : "text-muted-foreground"}`}>
                {reason.label}
              </span>
            </button>
          ))}
        </div>

        {/* Note */}
        {selectedCode && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">
              {requiresNote ? "הערה (חובה)" : "הערה (אופציונלי)"}
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="תאר בקצרה..."
              className="w-full h-20 px-3 py-2 rounded-xl border border-border bg-muted/30 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-warning/50"
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
            className="flex-1 py-3 rounded-xl bg-warning text-warning-foreground font-bold text-sm hover:bg-warning/90 disabled:opacity-50 min-h-[48px]"
          >
            דחה משימה
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeferTaskModal;
