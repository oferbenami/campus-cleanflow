import { useState, useMemo, useEffect } from "react";
import { useControlBoardData, type CBWorker, type CBTask, type CBTicket } from "@/hooks/useControlBoardData";
import { Calendar, Filter, Loader2, AlertTriangle, Zap, Clock, MapPin, Timer, Plus, ChevronLeft, ChevronRight, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";


// ── Constants ──
const SHIFTS = {
  morning: { start: 6, end: 14, label: "בוקר 06:00–14:00" },
  evening: { start: 14, end: 22, label: "ערב 14:00–22:00" },
} as const;
type ShiftKey = keyof typeof SHIFTS;

const LEFT_PANEL_W = "w-[140px]";
const ISSUE_COL_W = "w-[28px]";
const ROW_H = "h-[48px]";

// ── Tile color logic ──
type TileColor = "neutral" | "yellow" | "red" | "green";

function getTileColor(task: CBTask, now: Date): TileColor {
  if (task.status === "completed") return "green";
  if (task.status === "in_progress") {
    if (task.started_at) {
      const elapsed = (now.getTime() - new Date(task.started_at).getTime()) / 60000;
      if (elapsed > task.standard_minutes * 1.15) return "red";
    }
    return "yellow";
  }
  return "neutral";
}

const tileStyles: Record<TileColor, string> = {
  neutral: "bg-muted/60 border-border text-muted-foreground",
  yellow: "bg-warning/20 border-warning/50 text-warning-foreground",
  red: "bg-destructive/20 border-destructive/50 text-destructive animate-pulse-slow",
  green: "bg-success/20 border-success/50 text-foreground",
};

// ── Helpers ──
function parseTimeToMinutes(ts: string | null): number | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

function minutesToLeftPercent(minutes: number, hourStart: number, totalHours: number): number {
  return ((minutes - hourStart * 60) / (totalHours * 60)) * 100;
}

function minutesToWidthPercent(minutes: number, totalHours: number): number {
  return (minutes / (totalHours * 60)) * 100;
}

// ── Main Component ──
const VisualControlBoard = () => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [activeShift, setActiveShift] = useState<ShiftKey>("morning");
  const [selectedTask, setSelectedTask] = useState<CBTask | null>(null);
  const [now, setNow] = useState(new Date());
  const { workers, tasks, tickets, loading } = useControlBoardData(selectedDate);

  const shift = SHIFTS[activeShift];
  const HOUR_START = shift.start;
  const HOUR_END = shift.end;
  const TOTAL_HOURS = HOUR_END - HOUR_START;

  // Update "now" every 30s
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(iv);
  }, []);

  // Filter workers by active shift
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => w.shift_type === activeShift);
  }, [workers, activeShift]);

  // Group tasks by worker
  const tasksByWorker = useMemo(() => {
    const map: Record<string, CBTask[]> = {};
    tasks.forEach((t) => {
      if (!map[t.staff_user_id]) map[t.staff_user_id] = [];
      map[t.staff_user_id].push(t);
    });
    return map;
  }, [tasks]);

  // Group tickets by assigned worker
  const ticketsByWorker = useMemo(() => {
    const map: Record<string, CBTicket[]> = {};
    tickets.forEach((t) => {
      const key = t.assigned_to_user_id || "__unassigned__";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tickets]);

  // Now line position
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowLeftPct = minutesToLeftPercent(nowMinutes, HOUR_START, TOTAL_HOURS);
  const showNowLine = selectedDate === new Date().toISOString().split("T")[0] && nowMinutes >= HOUR_START * 60 && nowMinutes <= HOUR_END * 60;

  // Date navigation
  const changeDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-3">
      {/* ── Header controls ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date */}
        <div className="flex items-center gap-1 bg-card border rounded-lg px-2 py-1.5">
          <button onClick={() => changeDate(-1)} className="p-1 hover:bg-muted rounded"><ChevronRight size={14} /></button>
          <Calendar size={14} className="text-muted-foreground" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-sm font-semibold mono border-none outline-none w-[120px]"
          />
          <button onClick={() => changeDate(1)} className="p-1 hover:bg-muted rounded"><ChevronLeft size={14} /></button>
        </div>

        {/* Shift toggle */}
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {(["morning", "evening"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveShift(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeShift === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {s === "morning" ? "☀️ בוקר" : "🌙 ערב"}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mr-auto text-[10px]">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted border border-border" /> טרם הגיע</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-warning/40 border border-warning/50" /> בביצוע</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/40 border border-destructive/50" /> חריגה</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success/40 border border-success/50" /> הושלם</span>
        </div>

        <span className="text-xs text-muted-foreground">{filteredWorkers.length} עובדים · {tasks.length} משימות</span>
      </div>

      {/* ── Board ── */}
      <div className="border rounded-xl bg-card overflow-hidden">
        {/* Top header row */}
        <div className="flex border-b bg-muted/50">
          {/* Fixed left columns header */}
          <div className="shrink-0 flex border-l">
            <div className={`${ISSUE_COL_W} shrink-0 flex items-center justify-center py-2 border-l`}>
              <Zap size={10} className="text-destructive" />
            </div>
            <div className={`${LEFT_PANEL_W} shrink-0 flex items-center px-2 py-2 text-[10px] font-bold text-muted-foreground`}>
              עובד
            </div>
          </div>

          {/* Timeline header */}
          <div className="flex-1 min-w-0">
            <div className="relative w-full">
              {/* Shift label */}
              <div className="flex h-6 text-[9px] font-bold">
                <div
                  className={`w-full flex items-center justify-center border-l ${
                    activeShift === "morning" ? "bg-info/10 text-info border-info/20" : "bg-accent/10 text-accent-foreground border-accent/20"
                  }`}
                >
                  {shift.label}
                </div>
              </div>
              {/* Hour ticks */}
              <div className="flex h-5 border-t">
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={i}
                    className="border-l border-border/50 text-[9px] text-muted-foreground mono flex items-center justify-center"
                    style={{ width: `${100 / TOTAL_HOURS}%` }}
                  >
                    {String(HOUR_START + i).padStart(2, "0")}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex">
          {/* Fixed left panel */}
          <div className="shrink-0 flex border-l">
            <div>
              {filteredWorkers.length === 0 && (
                <div className="flex items-center justify-center px-4 py-10 text-sm text-muted-foreground">
                  אין עובדים משובצים
                </div>
              )}
              {filteredWorkers.map((worker) => {
                const workerTickets = ticketsByWorker[worker.id] || [];

                return (
                  <div key={worker.assignment_id} className={`flex border-b ${ROW_H}`}>
                    {/* Issue indicator */}
                    <div className={`${ISSUE_COL_W} shrink-0 flex items-center justify-center border-l`}>
                      {workerTickets.length > 0 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-3.5 h-3.5 rounded-full bg-destructive cursor-pointer animate-pulse" />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-[200px]">
                            <p className="text-xs font-bold">{workerTickets[0].description}</p>
                            <p className="text-[10px] text-muted-foreground">{workerTickets[0].location_name}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-success/40" />
                      )}
                    </div>

                    {/* Worker name only */}
                    <div className={`${LEFT_PANEL_W} shrink-0 flex items-center gap-1.5 px-2`}>
                      <p className="text-[11px] font-semibold truncate">{worker.full_name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="w-full">
              {filteredWorkers.map((worker) => {
                const workerTasks = tasksByWorker[worker.id] || [];

                return (
                  <div key={worker.assignment_id} className={`relative border-b ${ROW_H}`}>
                    {/* Hour grid lines */}
                    {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-l border-border/30"
                        style={{ left: `${(i / TOTAL_HOURS) * 100}%` }}
                      />
                    ))}

                    {/* Now line */}
                    {showNowLine && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10"
                        style={{ left: `${nowLeftPct}%` }}
                      />
                    )}

                    {/* Task tiles */}
                    {workerTasks.map((task) => {
                      const startMin = parseTimeToMinutes(task.window_start) || parseTimeToMinutes(task.started_at);
                      if (startMin === null) {
                        const seqOffset = (task.sequence_order || 0) * task.standard_minutes;
                        const baseStart = HOUR_START * 60;
                        const leftPct = minutesToLeftPercent(baseStart + seqOffset, HOUR_START, TOTAL_HOURS);
                        const widthPct = minutesToWidthPercent(task.standard_minutes, TOTAL_HOURS);
                        const color = getTileColor(task, now);
                        return (
                          <TaskTileGantt
                            key={task.id}
                            task={task}
                            leftPct={leftPct}
                            widthPct={Math.max(widthPct, 1)}
                            color={color}
                            onClick={() => setSelectedTask(task)}
                          />
                        );
                      }

                      const endMin = parseTimeToMinutes(task.window_end) || (startMin + task.standard_minutes);
                      const leftPct = minutesToLeftPercent(startMin, HOUR_START, TOTAL_HOURS);
                      const widthPct = minutesToWidthPercent(endMin - startMin, TOTAL_HOURS);
                      const color = getTileColor(task, now);

                      return (
                        <TaskTileGantt
                          key={task.id}
                          task={task}
                          leftPct={leftPct}
                          widthPct={Math.max(widthPct, 1)}
                          color={color}
                          onClick={() => setSelectedTask(task)}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Task Detail Modal ── */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-md">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle className="text-right">{selectedTask.task_name}</DialogTitle>
              </DialogHeader>
              <TaskDetailContent task={selectedTask} now={now} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Task Tile on Gantt ──
const TaskTileGantt = ({
  task,
  leftPct,
  widthPct,
  color,
  onClick,
}: {
  task: CBTask;
  leftPct: number;
  widthPct: number;
  color: TileColor;
  onClick: () => void;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        onClick={onClick}
        className={`absolute top-1 bottom-1 rounded border text-[8px] font-semibold truncate px-0.5 flex items-center gap-0.5 transition-all hover:ring-1 hover:ring-ring z-[5] ${tileStyles[color]} ${
          task.is_deferred ? "bg-stripes" : ""
        }`}
        style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: 18 }}
      >
        {task.priority === "high" && <AlertTriangle size={8} className="shrink-0 text-destructive" />}
        <span className="truncate">{task.location_name || task.task_name}</span>
      </button>
    </TooltipTrigger>
    <TooltipContent side="top" className="text-right max-w-[220px]">
      <p className="font-bold text-xs">{task.task_name}</p>
      <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin size={9} /> {task.location_name}</p>
      <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Timer size={9} /> {task.standard_minutes} דק׳ תקן</p>
      {task.started_at && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock size={9} /> התחלה: {new Date(task.started_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </TooltipContent>
  </Tooltip>
);

// ── Task Detail Content ──
const TaskDetailContent = ({ task, now }: { task: CBTask; now: Date }) => {
  const elapsed = task.started_at
    ? Math.round((now.getTime() - new Date(task.started_at).getTime()) / 60000)
    : null;
  const variance = elapsed !== null ? Math.round(((elapsed - task.standard_minutes) / task.standard_minutes) * 100) : null;

  const statusLabel: Record<string, string> = {
    queued: "בתור",
    ready: "מוכן",
    in_progress: "בביצוע",
    completed: "הושלם",
    blocked: "חסום",
    failed: "נכשל",
  };

  return (
    <div className="space-y-4 text-right">
      <div className="grid grid-cols-2 gap-3">
        <InfoBlock label="מיקום" value={task.location_name} icon={<MapPin size={12} />} />
        <InfoBlock label="סטטוס" value={statusLabel[task.status] || task.status} icon={<Clock size={12} />} />
        <InfoBlock label="תקן (דק׳)" value={String(task.standard_minutes)} icon={<Timer size={12} />} />
        <InfoBlock
          label="זמן שעבר"
          value={elapsed !== null ? `${elapsed} דק׳` : "—"}
          icon={<Timer size={12} />}
          highlight={elapsed !== null && elapsed > task.standard_minutes * 1.15 ? "destructive" : undefined}
        />
        {task.started_at && (
          <InfoBlock label="התחלה" value={new Date(task.started_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })} icon={<Clock size={12} />} />
        )}
        {task.finished_at && (
          <InfoBlock label="סיום" value={new Date(task.finished_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })} icon={<Clock size={12} />} />
        )}
        {variance !== null && (
          <InfoBlock
            label="סטייה"
            value={`${variance > 0 ? "+" : ""}${variance}%`}
            icon={<AlertTriangle size={12} />}
            highlight={variance > 15 ? "destructive" : variance > 0 ? "warning" : "success"}
          />
        )}
        <InfoBlock label="עדיפות" value={task.priority === "high" ? "גבוה" : "רגיל"} icon={<AlertTriangle size={12} />} />
      </div>

      {task.is_deferred && (
        <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 text-xs">
          <p className="font-bold text-warning">משימה נדחתה</p>
        </div>
      )}
    </div>
  );
};

const InfoBlock = ({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: "destructive" | "warning" | "success";
}) => (
  <div className="rounded-lg bg-muted/50 p-2.5">
    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-0.5">{icon} {label}</p>
    <p className={`text-sm font-semibold mono ${
      highlight === "destructive" ? "text-destructive" :
      highlight === "warning" ? "text-warning" :
      highlight === "success" ? "text-success" : ""
    }`}>{value}</p>
  </div>
);

export default VisualControlBoard;
