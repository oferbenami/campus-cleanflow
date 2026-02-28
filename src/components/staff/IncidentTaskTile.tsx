import { useState, useEffect } from "react";
import { AlertTriangle, MapPin, Play, CheckCircle2, PauseCircle, Shield, Timer } from "lucide-react";
import type { Incident } from "@/hooks/useIncidents";

interface Props {
  incident: Incident;
  onAccept: () => void;
  onStart: () => void;
  onResolve: () => void;
  onDefer: (reason: string) => void;
}

const categoryLabels: Record<string, string> = {
  spill: "שפיכה", restroom: "שירותים", safety: "בטיחות",
  damage: "נזק", equipment: "ציוד", other: "אחר",
};

const priorityConfig: Record<string, { label: string; class: string }> = {
  critical: { label: "קריטי", class: "bg-destructive/15 text-destructive" },
  urgent: { label: "דחוף", class: "bg-warning/15 text-warning" },
  high: { label: "גבוה", class: "bg-warning/15 text-warning" },
  normal: { label: "רגיל", class: "bg-primary/15 text-primary" },
  low: { label: "נמוך", class: "bg-muted text-muted-foreground" },
};

const IncidentTaskTile = ({ incident, onAccept, onStart, onResolve, onDefer }: Props) => {
  const [showDefer, setShowDefer] = useState(false);
  const [deferReason, setDeferReason] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const isAssigned = incident.status === "assigned";
  const isInProgress = incident.status === "in_progress";

  // Timer for in_progress incidents
  useEffect(() => {
    if (!isInProgress || !incident.started_at) return;
    const update = () => {
      const elapsed = Math.floor((Date.now() - new Date(incident.started_at!).getTime()) / 1000);
      setElapsedSeconds(elapsed);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [isInProgress, incident.started_at]);

  const timeDisplay = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`;
  const prio = priorityConfig[incident.priority] || priorityConfig.normal;

  return (
    <div className="w-full text-right task-card border-2 border-destructive bg-destructive/5 animate-pulse-slow ring-2 ring-destructive/50 shadow-lg relative overflow-hidden">
      {/* Flashing red top bar */}
      <div className="h-1.5 w-full rounded-t-xl -mt-5 -mx-5 mb-3 bg-destructive animate-pulse" style={{ width: "calc(100% + 2.5rem)" }} />

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-destructive/20 flex items-center justify-center">
            <Shield size={16} className="text-destructive" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-destructive">
            תקלה מיידית
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`status-badge text-[10px] py-0.5 px-1.5 font-bold ${prio.class}`}>
            {prio.label}
          </span>
          <span className="status-badge bg-muted text-muted-foreground text-[10px] py-0.5 px-1.5">
            {categoryLabels[incident.category] || incident.category}
          </span>
        </div>
      </div>

      {/* Location */}
      <div className="flex items-center gap-2 mb-1">
        <MapPin size={16} className="text-destructive shrink-0" />
        <span className="font-bold text-2xl truncate text-foreground">{incident.location_name}</span>
      </div>

      {/* Description */}
      <p className="text-lg font-semibold mb-2 text-foreground">{incident.description}</p>

      {/* Photo */}
      {incident.photo_url && (
        <img src={incident.photo_url} alt="" className="rounded-lg max-h-24 w-full object-cover mb-2" />
      )}

      {/* Timer (when in progress) */}
      {isInProgress && (
        <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-destructive/10 mb-2">
          <Timer size={16} className="text-destructive" />
          <span className="mono text-2xl font-black text-destructive">{timeDisplay}</span>
          <span className="text-xs text-muted-foreground">/ {incident.resolution_sla_minutes} דק׳</span>
        </div>
      )}

      {/* SLA info */}
      {isAssigned && incident.response_sla_remaining_min !== null && (
        <div className="flex items-center gap-2 text-xs text-destructive mb-2">
          <AlertTriangle size={12} />
          <span>
            {incident.response_sla_remaining_min > 0
              ? `${Math.ceil(incident.response_sla_remaining_min)} דק׳ לתגובה`
              : "חריגת SLA תגובה!"}
          </span>
        </div>
      )}

      {/* Actions */}
      {!showDefer ? (
        <div className="space-y-2 mt-3">
          {/* Accept (assigned state) */}
          {isAssigned && (
            <button
              onClick={onAccept}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm hover:bg-destructive/90 transition-colors min-h-[48px]"
            >
              <Play size={18} />
              קבל תקלה והתחל טיפול
            </button>
          )}

          {/* Resolve (in_progress state) */}
          {isInProgress && (
            <button
              onClick={onResolve}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-success text-success-foreground font-bold text-sm hover:bg-success/90 transition-colors min-h-[48px]"
            >
              <CheckCircle2 size={18} />
              סיום טיפול בתקלה
            </button>
          )}

          {/* Defer */}
          <button
            onClick={() => setShowDefer(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-warning/30 text-warning text-sm font-medium hover:bg-warning/5 transition-colors min-h-[44px]"
          >
            <PauseCircle size={16} />
            דחה תקלה
          </button>
        </div>
      ) : (
        <div className="space-y-2 mt-3">
          <textarea
            value={deferReason}
            onChange={(e) => setDeferReason(e.target.value)}
            placeholder="סיבת הדחייה..."
            className="w-full rounded-xl bg-muted/50 border border-border text-foreground placeholder-muted-foreground p-3 text-sm min-h-[70px] resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => { if (deferReason.trim()) onDefer(deferReason.trim()); }}
              disabled={!deferReason.trim()}
              className="flex-1 py-3 rounded-xl bg-warning text-warning-foreground font-bold text-sm disabled:opacity-50"
            >
              שלח דחייה
            </button>
            <button
              onClick={() => setShowDefer(false)}
              className="py-3 px-4 rounded-xl bg-muted text-muted-foreground font-semibold text-sm"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentTaskTile;
