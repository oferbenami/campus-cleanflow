import { useState } from "react";
import { type Incident } from "@/hooks/useIncidents";
import { AlertTriangle, MapPin, Play, ArrowRight, Timer, Shield, XCircle } from "lucide-react";

interface Props {
  incident: Incident;
  onAccept: () => void;
  onDefer: (reason: string) => void;
  onReassignBack: () => void;
}

const categoryLabels: Record<string, string> = {
  spill: "שפיכה", restroom: "שירותים", safety: "בטיחות",
  damage: "נזק", equipment: "ציוד", other: "אחר",
};

const priorityLabels: Record<string, string> = {
  critical: "קריטי", urgent: "דחוף", high: "גבוה", normal: "רגיל", low: "נמוך",
};

const WorkerIncidentAlert = ({ incident, onAccept, onDefer, onReassignBack }: Props) => {
  const [showDefer, setShowDefer] = useState(false);
  const [deferReason, setDeferReason] = useState("");

  const handleDefer = () => {
    if (deferReason.trim()) {
      onDefer(deferReason.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-destructive/95 flex flex-col items-center justify-center p-6 animate-fade-in">
      {/* Pulsing icon */}
      <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-4 animate-pulse">
        <Shield size={40} className="text-white" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-black text-white mb-1">אירוע דחוף!</h1>
      <p className="text-sm text-white/80 mb-6">נדרש טיפול מיידי</p>

      {/* Incident details */}
      <div className="w-full max-w-sm bg-white/10 backdrop-blur-sm rounded-2xl p-5 space-y-3 border border-white/20">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold">
            {priorityLabels[incident.priority]}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-xs">
            {categoryLabels[incident.category]}
          </span>
        </div>

        <p className="text-xl font-bold text-white">{incident.description}</p>

        <div className="flex items-center gap-2 text-white/80 text-sm">
          <MapPin size={14} />
          <span>{incident.location_name}</span>
        </div>

        {incident.photo_url && (
          <img src={incident.photo_url} alt="" className="rounded-lg max-h-32 w-full object-cover" />
        )}
      </div>

      {/* Actions */}
      {!showDefer ? (
        <div className="w-full max-w-sm mt-6 space-y-3">
          <button
            onClick={onAccept}
            className="w-full py-4 rounded-xl bg-white text-destructive font-bold text-lg flex items-center justify-center gap-2 hover:bg-white/90 transition-colors"
          >
            <Play size={22} />
            קבל וטפל
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => setShowDefer(true)}
              className="flex-1 py-3 rounded-xl bg-white/20 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/30 transition-colors"
            >
              <Timer size={16} />
              דחה
            </button>
            <button
              onClick={onReassignBack}
              className="flex-1 py-3 rounded-xl bg-white/20 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/30 transition-colors"
            >
              <ArrowRight size={16} />
              החזר למפקח
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-sm mt-6 space-y-3">
          <textarea
            value={deferReason}
            onChange={(e) => setDeferReason(e.target.value)}
            placeholder="סיבת הדחייה..."
            className="w-full rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 p-3 text-sm min-h-[80px] resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleDefer}
              disabled={!deferReason.trim()}
              className="flex-1 py-3 rounded-xl bg-white text-destructive font-bold text-sm disabled:opacity-50"
            >
              שלח דחייה
            </button>
            <button
              onClick={() => setShowDefer(false)}
              className="py-3 px-4 rounded-xl bg-white/20 text-white font-semibold text-sm"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerIncidentAlert;
