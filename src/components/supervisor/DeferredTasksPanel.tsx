import { useMemo } from "react";
import { RotateCcw, AlertTriangle, Clock, MapPin, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DeferredTaskEvent } from "@/hooks/useSupervisorData";

interface DeferredTasksPanelProps {
  events: DeferredTaskEvent[];
}

const REASON_LABELS: Record<string, string> = {
  "Location not available / Occupied": "חדר תפוס",
  "Access denied / Locked": "גישה חסומה",
  "Safety hazard": "סיכון בטיחותי",
  "Equipment missing": "ציוד חסר",
  "Not in scope / unclear instructions": "לא בתחום",
  "Other": "אחר",
};

const DeferredTasksPanel = ({ events }: DeferredTasksPanelProps) => {
  // Group by staff
  const staffGroups = useMemo(() => {
    const map: Record<string, { name: string; events: DeferredTaskEvent[] }> = {};
    events.forEach((e) => {
      if (!map[e.staff_user_id]) map[e.staff_user_id] = { name: e.staff_name, events: [] };
      map[e.staff_user_id].events.push(e);
    });
    return Object.entries(map).sort((a, b) => b[1].events.length - a[1].events.length);
  }, [events]);

  // Top reasons
  const reasonStats = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      const label = REASON_LABELS[e.reason] || e.reason || "לא צוין";
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [events]);

  // SLA at-risk tasks (deferred but not completed, with window_end approaching)
  const slaRiskTasks = useMemo(() => {
    return events.filter((e) => {
      if (e.task_status === "completed") return false;
      // Still open/blocked/queued
      return true;
    });
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="task-card">
        <div className="flex items-center gap-2 mb-2">
          <RotateCcw size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold">משימות שנדחו</h3>
        </div>
        <p className="text-center text-muted-foreground py-4 text-sm">אין דחיות היום ✓</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="kpi-card text-center">
          <p className="text-2xl font-bold mono text-warning">{events.length}</p>
          <p className="text-xs text-muted-foreground">דחיות היום</p>
        </div>
        <div className="kpi-card text-center">
          <p className="text-2xl font-bold mono text-destructive">{slaRiskTasks.length}</p>
          <p className="text-xs text-muted-foreground">בסיכון SLA</p>
        </div>
        <div className="kpi-card text-center">
          <p className="text-2xl font-bold mono">{staffGroups.length}</p>
          <p className="text-xs text-muted-foreground">עובדים</p>
        </div>
      </div>

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
                    <div
                      className="h-full bg-warning rounded-full"
                      style={{ width: `${Math.min(100, (count / events.length) * 100)}%` }}
                    />
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
          <RotateCcw size={14} className="text-info" />
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
                  const isAtRisk = evt.task_status !== "completed";
                  const reasonLabel = REASON_LABELS[evt.reason] || evt.reason;
                  return (
                    <div
                      key={evt.id}
                      className={`rounded-lg p-2.5 text-xs ${
                        isAtRisk
                          ? "bg-destructive/5 border border-destructive/30"
                          : "bg-success/5 border border-success/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{evt.task_name}</span>
                        {isAtRisk ? (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                            <RotateCcw size={9} className="mr-0.5" />
                            חובה לחזור
                          </Badge>
                        ) : (
                          <Badge className="text-[9px] px-1.5 py-0 bg-success text-success-foreground">
                            הושלם
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />
                          {evt.location_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(evt.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-1.5 py-0.5 rounded bg-warning/15 text-warning font-medium text-[10px]">
                          {reasonLabel}
                        </span>
                        {evt.defer_action === "defer_swap" && (
                          <span className="text-[10px] text-info font-medium">הוחלף עם הבא</span>
                        )}
                        {evt.defer_action === "defer_end" && (
                          <span className="text-[10px] text-muted-foreground">הועבר לסוף</span>
                        )}
                      </div>
                      {evt.note && (
                        <p className="text-[10px] text-muted-foreground mt-1 italic">"{evt.note}"</p>
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
