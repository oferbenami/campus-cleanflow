import { useMemo } from "react";
import { RotateCcw, AlertTriangle, Clock, MapPin, Phone, ShieldAlert, PauseCircle, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DeferredTaskEvent } from "@/hooks/useSupervisorData";

interface DeferredTasksPanelProps {
  events: DeferredTaskEvent[];
}

const REASON_LABELS: Record<string, string> = {
  occupied: "חדר תפוס",
  locked: "גישה חסומה",
  safety: "סיכון בטיחותי",
  equipment: "ציוד חסר",
  incident: "אירוע דחוף",
  other: "אחר",
  // Legacy labels
  "Location not available / Occupied": "חדר תפוס",
  "Access denied / Locked": "גישה חסומה",
  "Safety hazard": "סיכון בטיחותי",
  "Equipment missing": "ציוד חסר",
  "Not in scope / unclear instructions": "לא בתחום",
  "Other": "אחר",
};

const DeferredTasksPanel = ({ events }: DeferredTasksPanelProps) => {
  const staffGroups = useMemo(() => {
    const map: Record<string, { name: string; events: DeferredTaskEvent[] }> = {};
    events.forEach((e) => {
      if (!map[e.staff_user_id]) map[e.staff_user_id] = { name: e.staff_name, events: [] };
      map[e.staff_user_id].events.push(e);
    });
    return Object.entries(map).sort((a, b) => b[1].events.length - a[1].events.length);
  }, [events]);

  const reasonStats = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      const label = REASON_LABELS[e.reason_code] || REASON_LABELS[e.reason] || e.reason || "לא צוין";
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [events]);

  const slaRiskTasks = useMemo(() => events.filter((e) => !["completed", "failed"].includes(e.task_status || "")), [events]);
  const escalations = useMemo(() => events.filter((e) => e.is_escalation), [events]);
  const criticalDefers = useMemo(() => events.filter((e) => e.is_critical), [events]);
  const missedTasks = useMemo(() => events.filter((e) => e.task_status === "missed"), [events]);

  if (events.length === 0) {
    return (
      <div className="task-card">
        <div className="flex items-center gap-2 mb-2">
          <PauseCircle size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold">משימות שנדחו</h3>
        </div>
        <p className="text-center text-muted-foreground py-4 text-sm">אין דחיות היום ✓</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-2">
        <div className="kpi-card text-center">
          <p className="text-2xl font-bold mono text-warning">{events.length}</p>
          <p className="text-[10px] text-muted-foreground">דחיות</p>
        </div>
        <div className="kpi-card text-center">
          <p className="text-2xl font-bold mono text-destructive">{slaRiskTasks.length}</p>
          <p className="text-[10px] text-muted-foreground">סיכון SLA</p>
        </div>
        <div className="kpi-card text-center">
          <p className="text-2xl font-bold mono text-destructive">{escalations.length}</p>
          <p className="text-[10px] text-muted-foreground">חוזרות</p>
        </div>
        <div className="kpi-card text-center">
          <p className="text-2xl font-bold mono">{missedTasks.length}</p>
          <p className="text-[10px] text-muted-foreground">הוחמצו</p>
        </div>
      </div>

      {/* Critical / Escalation alerts */}
      {(criticalDefers.length > 0 || escalations.length > 0) && (
        <div className="space-y-2">
          {criticalDefers.map((evt) => (
            <div key={`crit-${evt.id}`} className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive font-medium">
              <ShieldAlert size={14} className="shrink-0" />
              <span>
                מיקום קריטי נדחה: <strong>{evt.location_name}</strong> — {evt.staff_name}
              </span>
            </div>
          ))}
          {escalations.map((evt) => (
            <div key={`esc-${evt.id}`} className="flex items-center gap-2 p-3 rounded-xl bg-warning/10 border border-warning/30 text-xs text-warning font-medium">
              <Phone size={14} className="shrink-0" />
              <span>
                דחייה חוזרת ({evt.defer_count}x): <strong>{evt.task_name}</strong> — {evt.staff_name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Top Reasons */}
      {reasonStats.length > 0 && (
        <div className="task-card">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-warning" />
            סיבות מובילות
          </h3>
          <div className="space-y-2">
            {reasonStats.map(([reason, count]) => (
              <div key={reason} className="flex items-center justify-between">
                <span className="text-sm">{reason}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-warning rounded-full" style={{ width: `${Math.min(100, (count / events.length) * 100)}%` }} />
                  </div>
                  <span className="text-sm font-bold mono w-6 text-left">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deferred Tasks by Staff */}
      <div className="task-card">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <PauseCircle size={14} className="text-info" />
          דחיות לפי עובד
        </h3>
        <div className="space-y-3">
          {staffGroups.map(([staffId, { name, events: staffEvents }]) => (
            <div key={staffId} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </div>
                  <span className="text-sm font-semibold">{name}</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {staffEvents.length} דחיות
                </Badge>
              </div>
              <div className="space-y-1.5">
                {staffEvents.map((evt) => {
                  const isAtRisk = !["completed", "failed"].includes(evt.task_status || "");
                  const reasonLabel = REASON_LABELS[evt.reason_code] || REASON_LABELS[evt.reason] || evt.reason;
                  return (
                    <div
                      key={evt.id}
                      className={`rounded-lg p-2.5 text-xs ${
                        isAtRisk ? "bg-destructive/5 border border-destructive/30" : "bg-success/5 border border-success/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{evt.task_name}</span>
                        <div className="flex items-center gap-1">
                          {evt.defer_count > 1 && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-warning border-warning/30">
                              {evt.defer_count}x
                            </Badge>
                          )}
                          {isAtRisk ? (
                            <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                              <RotateCcw size={9} className="mr-0.5" /> חובה לחזור
                            </Badge>
                          ) : (
                            <Badge className="text-[9px] px-1.5 py-0 bg-success text-success-foreground">הושלם</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><MapPin size={10} />{evt.location_name}</span>
                        {(evt.building_name || evt.floor_name) && (
                          <span className="flex items-center gap-1"><Building size={10} />{[evt.building_name, evt.floor_name && `קומה ${evt.floor_name}`].filter(Boolean).join(" · ")}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(evt.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-1.5 py-0.5 rounded bg-warning/15 text-warning font-medium text-[10px]">{reasonLabel}</span>
                        {evt.defer_action === "defer_swap" && <span className="text-[10px] text-info font-medium">הוחלף עם הבא</span>}
                        {evt.defer_action === "defer_end" && <span className="text-[10px] text-muted-foreground">הועבר לסוף</span>}
                        {evt.is_critical && (
                          <span className="text-[10px] text-destructive font-medium flex items-center gap-0.5">
                            <ShieldAlert size={9} /> קריטי
                          </span>
                        )}
                      </div>
                      {evt.note && <p className="text-[10px] text-muted-foreground mt-1 italic">"{evt.note}"</p>}
                      {evt.partial_elapsed_minutes > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">⏱ {evt.partial_elapsed_minutes} דק׳ חלפו לפני הדחייה</p>
                      )}
                      {isAtRisk && evt.standard_minutes && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-destructive font-medium">
                          <AlertTriangle size={10} />
                          סיכון SLA — {evt.standard_minutes} דק׳ תקן
                          {evt.window_end && ` · חלון עד ${new Date(evt.window_end).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeferredTasksPanel;
