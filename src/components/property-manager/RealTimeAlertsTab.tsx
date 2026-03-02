import { useState, useMemo, useEffect } from "react";
import {
  AlertTriangle, Clock, TrendingDown, Users, Zap, ChevronDown, ChevronUp,
  RefreshCw, Building2, Timer, ArrowDown, ArrowUp, X,
} from "lucide-react";
import { useControlBoardData, type CBTask, type CBWorker } from "@/hooks/useControlBoardData";
import { Badge } from "@/components/ui/badge";

/* ─── Alert types ─── */
interface AlertItem {
  id: string;
  category: AlertCategory;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  workerName?: string;
  taskName?: string;
  timestamp: Date;
  meta?: Record<string, any>;
}

type AlertCategory =
  | "time_overrun"      // חריגת זמן
  | "delayed_start"     // פיגור בהתחלה
  | "capacity_breach"   // חריגת קיבולת
  | "deferred_tasks"    // משימות שנדחו
  | "idle_worker"       // עובד בהמתנה
  | "plan_mismatch";    // אי-התאמה תוכנית-ביצוע

const CATEGORY_META: Record<AlertCategory, { label: string; icon: React.ReactNode; color: string }> = {
  time_overrun:    { label: "חריגת זמן",       icon: <Clock size={16} />,         color: "bg-destructive/15 border-destructive/30 text-destructive" },
  delayed_start:   { label: "פיגור בהתחלה",    icon: <Timer size={16} />,         color: "bg-warning/15 border-warning/30 text-warning" },
  capacity_breach: { label: "חריגת קיבולת",    icon: <TrendingDown size={16} />,  color: "bg-destructive/15 border-destructive/30 text-destructive" },
  deferred_tasks:  { label: "משימות נדחות",     icon: <RefreshCw size={16} />,     color: "bg-info/15 border-info/30 text-info" },
  idle_worker:     { label: "עובד בהמתנה",      icon: <Users size={16} />,         color: "bg-muted border-border text-muted-foreground" },
  plan_mismatch:   { label: "סטייה מתוכנית",    icon: <AlertTriangle size={16} />, color: "bg-warning/15 border-warning/30 text-warning" },
};

function generateAlerts(workers: CBWorker[], tasks: CBTask[], now: Date): AlertItem[] {
  const alerts: AlertItem[] = [];

  const tasksByWorker: Record<string, CBTask[]> = {};
  tasks.forEach((t) => {
    if (!tasksByWorker[t.staff_user_id]) tasksByWorker[t.staff_user_id] = [];
    tasksByWorker[t.staff_user_id].push(t);
  });

  const workerMap: Record<string, CBWorker> = {};
  workers.forEach((w) => (workerMap[w.id] = w));

  // 1. Time overruns (>15% over standard)
  tasks.forEach((t) => {
    if (t.status === "in_progress" && t.started_at) {
      const elapsed = (now.getTime() - new Date(t.started_at).getTime()) / 60000;
      const threshold = t.standard_minutes * 1.15;
      if (elapsed > threshold) {
        const pct = Math.round(((elapsed - t.standard_minutes) / t.standard_minutes) * 100);
        alerts.push({
          id: `overrun-${t.id}`,
          category: "time_overrun",
          severity: pct > 50 ? "critical" : "warning",
          title: `חריגה ${pct}% — ${t.task_name}`,
          description: `${Math.round(elapsed)} דק׳ מתוך ${t.standard_minutes} מתוכננות`,
          workerName: workerMap[t.staff_user_id]?.full_name,
          taskName: t.task_name,
          timestamp: new Date(t.started_at),
          meta: { elapsed: Math.round(elapsed), planned: t.standard_minutes, pct },
        });
      }
    }
  });

  // 2. Delayed starts — queued task whose window_start has passed
  tasks.forEach((t) => {
    if ((t.status === "queued" || t.status === "ready") && t.window_start) {
      const windowStart = new Date(t.window_start);
      const delayMin = (now.getTime() - windowStart.getTime()) / 60000;
      if (delayMin > 10) {
        alerts.push({
          id: `delay-${t.id}`,
          category: "delayed_start",
          severity: delayMin > 30 ? "critical" : "warning",
          title: `פיגור ${Math.round(delayMin)} דק׳ — ${t.task_name}`,
          description: `תוכננה ל-${windowStart.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`,
          workerName: workerMap[t.staff_user_id]?.full_name,
          taskName: t.task_name,
          timestamp: windowStart,
        });
      }
    }
  });

  // 3. Capacity breaches
  workers.forEach((w) => {
    if (w.total_planned_minutes > w.shift_capacity_minutes) {
      const overBy = w.total_planned_minutes - w.shift_capacity_minutes;
      alerts.push({
        id: `cap-${w.id}`,
        category: "capacity_breach",
        severity: overBy > 60 ? "critical" : "warning",
        title: `חריגה ${overBy} דק׳`,
        description: `${w.total_planned_minutes} דק׳ מתוכננות / ${w.shift_capacity_minutes} קיבולת`,
        workerName: w.full_name,
        timestamp: now,
      });
    }
  });

  // 4. Deferred tasks
  tasks.forEach((t) => {
    if (t.is_deferred || t.status === "deferred") {
      alerts.push({
        id: `def-${t.id}`,
        category: "deferred_tasks",
        severity: (t.defer_count || 0) >= 2 ? "warning" : "info",
        title: `נדחתה ${t.defer_count || 1} פעמים — ${t.task_name}`,
        description: t.location_name,
        workerName: workerMap[t.staff_user_id]?.full_name,
        taskName: t.task_name,
        timestamp: now,
      });
    }
  });

  // 5. Idle workers — have no in_progress task and completed count < 50%
  workers.forEach((w) => {
    const wTasks = tasksByWorker[w.id] || [];
    if (wTasks.length === 0) return;
    const hasActive = wTasks.some((t) => t.status === "in_progress");
    const completedPct = wTasks.filter((t) => t.status === "completed").length / wTasks.length;
    if (!hasActive && completedPct < 0.5 && completedPct > 0) {
      alerts.push({
        id: `idle-${w.id}`,
        category: "idle_worker",
        severity: "info",
        title: `${w.full_name} — אין משימה פעילה`,
        description: `${Math.round(completedPct * 100)}% הושלם`,
        workerName: w.full_name,
        timestamp: now,
      });
    }
  });

  // 6. Plan vs actual mismatches — completed tasks with >20% variance
  tasks.forEach((t) => {
    if (t.status === "completed" && t.actual_minutes) {
      const variance = ((t.actual_minutes - t.standard_minutes) / t.standard_minutes) * 100;
      if (Math.abs(variance) > 20) {
        alerts.push({
          id: `mismatch-${t.id}`,
          category: "plan_mismatch",
          severity: Math.abs(variance) > 40 ? "warning" : "info",
          title: `סטייה ${variance > 0 ? "+" : ""}${Math.round(variance)}%`,
          description: `${t.task_name}: ${t.actual_minutes} דק׳ בפועל / ${t.standard_minutes} תקן`,
          workerName: workerMap[t.staff_user_id]?.full_name,
          taskName: t.task_name,
          timestamp: t.finished_at ? new Date(t.finished_at) : now,
        });
      }
    }
  });

  return alerts.sort((a, b) => {
    const sevOrder = { critical: 0, warning: 1, info: 2 };
    return sevOrder[a.severity] - sevOrder[b.severity];
  });
}

/* ─── Component ─── */
const RealTimeAlertsTab = () => {
  const todayStr = new Date().toISOString().split("T")[0];
  const { workers, tasks, loading } = useControlBoardData(todayStr);
  const [now, setNow] = useState(new Date());
  const [expandedCategory, setExpandedCategory] = useState<AlertCategory | null>(null);

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(iv);
  }, []);

  const alerts = useMemo(() => generateAlerts(workers, tasks, now), [workers, tasks, now]);

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<AlertCategory, AlertItem[]> = {
      time_overrun: [],
      delayed_start: [],
      capacity_breach: [],
      deferred_tasks: [],
      idle_worker: [],
      plan_mismatch: [],
    };
    alerts.forEach((a) => map[a.category].push(a));
    return map;
  }, [alerts]);

  const activeCubes = (Object.entries(grouped) as [AlertCategory, AlertItem[]][]).filter(
    ([, items]) => items.length > 0
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-success/15 flex items-center justify-center">
          <Zap size={28} className="text-success" />
        </div>
        <h3 className="font-bold text-lg">הכל תקין ✓</h3>
        <p className="text-sm text-muted-foreground">אין חריגות או פיגורים כרגע</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header */}
      <div className="kpi-card">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base flex items-center gap-2">
            <AlertTriangle size={18} className="text-warning" />
            התראות בזמן אמת
          </h2>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="text-[10px]">
              {alerts.filter((a) => a.severity === "critical").length} קריטי
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {alerts.filter((a) => a.severity === "warning").length} אזהרה
            </Badge>
            <span className="text-[10px] text-muted-foreground mono">
              עדכון אחרון: {now.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>

      {/* Alert cubes grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {(Object.entries(CATEGORY_META) as [AlertCategory, typeof CATEGORY_META[AlertCategory]][]).map(
          ([cat, meta]) => {
            const items = grouped[cat];
            const criticalCount = items.filter((i) => i.severity === "critical").length;
            const isExpanded = expandedCategory === cat;
            const isEmpty = items.length === 0;

            return (
              <button
                key={cat}
                onClick={() => !isEmpty && setExpandedCategory(isExpanded ? null : cat)}
                disabled={isEmpty}
                className={`relative rounded-xl border-2 p-3 text-right transition-all ${
                  isEmpty
                    ? "bg-muted/30 border-border/30 opacity-40 cursor-default"
                    : isExpanded
                    ? `${meta.color} ring-2 ring-offset-2 ring-primary/20 shadow-lg`
                    : `${meta.color} hover:shadow-md cursor-pointer`
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-background/50 flex items-center justify-center">
                    {meta.icon}
                  </div>
                  {!isEmpty && (
                    <span className="text-2xl font-black">{items.length}</span>
                  )}
                </div>
                <p className="text-xs font-bold">{meta.label}</p>
                {criticalCount > 0 && (
                  <span className="absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
                )}
                {!isEmpty && (
                  <div className="absolute bottom-1.5 left-1.5">
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </div>
                )}
              </button>
            );
          }
        )}
      </div>

      {/* Expanded drill-down panel */}
      {expandedCategory && grouped[expandedCategory].length > 0 && (
        <div className="rounded-xl border-2 border-primary/20 bg-card overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b">
            <div className="flex items-center gap-2">
              {CATEGORY_META[expandedCategory].icon}
              <h3 className="font-bold text-sm">{CATEGORY_META[expandedCategory].label}</h3>
              <Badge variant="outline" className="text-[10px]">
                {grouped[expandedCategory].length} התראות
              </Badge>
            </div>
            <button
              onClick={() => setExpandedCategory(null)}
              className="p-1 rounded-lg hover:bg-muted transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <div className="divide-y max-h-[400px] overflow-y-auto">
            {grouped[expandedCategory].map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  alert.severity === "critical"
                    ? "bg-destructive/5"
                    : alert.severity === "warning"
                    ? "bg-warning/5"
                    : ""
                }`}
              >
                <div
                  className={`w-2 h-8 rounded-full shrink-0 ${
                    alert.severity === "critical"
                      ? "bg-destructive"
                      : alert.severity === "warning"
                      ? "bg-warning"
                      : "bg-muted-foreground/30"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{alert.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
                </div>
                {alert.workerName && (
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-medium shrink-0">
                    {alert.workerName}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground mono shrink-0">
                  {alert.timestamp.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeAlertsTab;
