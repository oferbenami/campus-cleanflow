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
    <div className="w-full text-right rounded-xl border-2 border-destructive bg-destructive/5 ring-1 ring-destructive/40 shadow-md relative overflow-hidden px-3 py-2">
      {/* Thin flashing red top bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-destructive animate-pulse" />

      {/* Compact single-row header */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1.5">
          <Shield size={14} className="text-destructive" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-destructive">תקלה</span>
          <span className={`text-[9px] py-0.5 px-1.5 rounded-full font-bold ${prio.class}`}>
            {prio.label}
          </span>
          <span className="text-[9px] py-0.5 px-1.5 rounded-full bg-muted text-muted-foreground">
            {categoryLabels[incident.category] || incident.category}
          </span>
        </div>
        {isInProgress && (
          <div className="flex items-center gap-1 bg-destructive/10 rounded-lg px-2 py-0.5">
            <Timer size={12} className="text-destructive" />
            <span className="mono text-sm font-black text-destructive">{timeDisplay}</span>
          </div>
        )}
        {isAssigned && incident.response_sla_remaining_min !== null && (
          <span className="text-[10px] text-destructive font-medium">
            {incident.response_sla_remaining_min > 0
              ? `${Math.ceil(incident.response_sla_remaining_min)} דק׳`
              : "חריגה!"}
          </span>
        )}
      </div>

      {/* Location + description in one compact row */}
      <div className="flex items-center gap-1.5 mt-1">
        <MapPin size={12} className="text-destructive shrink-0" />
        <span className="font-bold text-sm truncate text-foreground">{incident.location_name}</span>
        <span className="text-muted-foreground text-xs">—</span>
        <span className="text-xs text-foreground truncate flex-1">{incident.description}</span>
      </div>

      {/* Actions - compact */}
      {!showDefer ? (
        <div className="flex gap-2 mt-2">
          {isAssigned && (
            <button
              onClick={onAccept}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-destructive text-destructive-foreground font-bold text-xs hover:bg-destructive/90 transition-colors"
            >
              <Play size={14} />
              קבל וטפל
            </button>
          )}
          {isInProgress && (
            <button
              onClick={onResolve}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-success text-success-foreground font-bold text-xs hover:bg-success/90 transition-colors"
            >
              <CheckCircle2 size={14} />
              סיום טיפול
            </button>
          )}
          <button
            onClick={() => setShowDefer(true)}
            className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg border border-warning/30 text-warning text-xs font-medium hover:bg-warning/5 transition-colors"
          >
            <PauseCircle size={13} />
            דחה
          </button>
        </div>
      ) : (
        <div className="space-y-1.5 mt-2">
          <textarea
            value={deferReason}
            onChange={(e) => setDeferReason(e.target.value)}
            placeholder="סיבת הדחייה..."
            className="w-full rounded-lg bg-muted/50 border border-border text-foreground placeholder-muted-foreground p-2 text-xs min-h-[50px] resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => { if (deferReason.trim()) onDefer(deferReason.trim()); }}
              disabled={!deferReason.trim()}
              className="flex-1 py-2 rounded-lg bg-warning text-warning-foreground font-bold text-xs disabled:opacity-50"
            >
              שלח דחייה
            </button>
            <button
              onClick={() => setShowDefer(false)}
              className="py-2 px-3 rounded-lg bg-muted text-muted-foreground font-semibold text-xs"
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
