import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertTriangle,
  Star,
  Send,
  ClipboardCheck,
  Zap,
  CheckCircle2,
  Users,
  Activity,
  BarChart3,
  Coffee,
  MapPin,
  Clock,
  TrendingUp,
  Camera,
  PackageOpen,
  Truck,
  ShieldAlert,
  LogOut,
  Loader2,
  Timer,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/i18n/I18nContext";
import { toast } from "@/hooks/use-toast";
import { useSupervisorData } from "@/hooks/useSupervisorData";
import type { SupervisorTask, LocationOption } from "@/hooks/useSupervisorData";

const SupervisorView = () => {
  const { t } = useI18n();
  const { signOut } = useAuth();
  const { staff, tasks, tickets, audits, locations, loading, createBreakFixTicket, submitAudit } = useSupervisorData();
  const [activeTab, setActiveTab] = useState<"dashboard" | "breakfix" | "audit">("dashboard");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs opacity-75 uppercase tracking-wider">CleanFlow</p>
            <h1 className="text-lg font-bold">{t("supervisor.panel")}</h1>
          </div>
          <button onClick={signOut} className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors" title="התנתק">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4">
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
          {([
            { key: "dashboard" as const, icon: BarChart3, label: t("supervisor.dashboard") },
            { key: "breakfix" as const, icon: Zap, label: t("supervisor.breakFix") },
            { key: "audit" as const, icon: ClipboardCheck, label: t("supervisor.audit") },
          ]).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {activeTab === "dashboard" && <DashboardTab staff={staff} tasks={tasks} tickets={tickets} />}
        {activeTab === "breakfix" && <BreakfixTab locations={locations} onSubmit={createBreakFixTicket} tickets={tickets} />}
        {activeTab === "audit" && <AuditTab tasks={tasks} audits={audits} onSubmit={submitAudit} />}
      </div>
    </div>
  );
};

/* ─── Dashboard Tab ─── */
const DashboardTab = ({ staff, tasks, tickets }: {
  staff: ReturnType<typeof useSupervisorData>["staff"];
  tasks: SupervisorTask[];
  tickets: ReturnType<typeof useSupervisorData>["tickets"];
}) => {
  const { t } = useI18n();

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const overdueTasks = tasks.filter((t) => {
    if (t.status !== "in_progress" || !t.started_at) return false;
    const elapsed = (Date.now() - new Date(t.started_at).getTime()) / 60000;
    return elapsed > t.standard_minutes * 1.15;
  }).length;
  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "assigned").length;

  // Group tasks by staff
  const staffMap = useMemo(() => {
    const map: Record<string, { name: string; tasks: SupervisorTask[] }> = {};
    tasks.forEach((t) => {
      if (!map[t.staff_user_id]) map[t.staff_user_id] = { name: t.staff_name, tasks: [] };
      map[t.staff_user_id].tasks.push(t);
    });
    return Object.entries(map);
  }, [tasks]);

  return (
    <div className="animate-slide-up space-y-4">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="kpi-card text-right">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-info/15 flex items-center justify-center">
              <Users size={20} className="text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">{staff.length}</p>
              <p className="text-xs text-muted-foreground">{t("manager.activeStaff")}</p>
            </div>
          </div>
        </div>
        <div className="kpi-card text-right">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/15 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedTasks}/{totalTasks}</p>
              <p className="text-xs text-muted-foreground">{t("manager.tasksCompleted")}</p>
            </div>
          </div>
        </div>
        <div className="kpi-card text-right">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
              <Activity size={20} className="text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgress}</p>
              <p className="text-xs text-muted-foreground">{t("manager.inProgress")}</p>
            </div>
          </div>
        </div>
        <div className="kpi-card text-right">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/15 flex items-center justify-center">
              <AlertTriangle size={20} className="text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overdueTasks}</p>
              <p className="text-xs text-muted-foreground">{t("manager.overdue")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Break-Fix Summary */}
      <div className="kpi-card">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={16} className="text-warning" />
          <h3 className="text-sm font-semibold">{t("manager.breakFix.title")}</h3>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-2xl font-bold mono">{openTickets}</p>
            <p className="text-xs text-muted-foreground">פתוחות</p>
          </div>
          <div>
            <p className="text-2xl font-bold mono text-success">{tickets.filter((t) => t.status === "resolved" || t.status === "closed").length}</p>
            <p className="text-xs text-muted-foreground">נסגרו</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      {totalTasks > 0 && (
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-success" />
            <h3 className="text-sm font-semibold">{t("manager.progressScore")}</h3>
          </div>
          <div className="flex items-center gap-4">
            <p className={`text-3xl font-bold mono ${
              (completedTasks / totalTasks) * 100 >= 90 ? "text-success" :
              (completedTasks / totalTasks) * 100 >= 70 ? "text-warning" : "text-destructive"
            }`}>
              {Math.round((completedTasks / totalTasks) * 100)}%
            </p>
            <Progress
              value={(completedTasks / totalTasks) * 100}
              className="flex-1 h-3"
            />
          </div>
        </div>
      )}

      {/* Staff Tracking */}
      <div className="task-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <BarChart3 size={16} />
            {t("manager.staffTracking")}
          </h2>
          <span className="status-badge status-active">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            {t("manager.live")}
          </span>
        </div>

        {staffMap.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">אין עובדים משובצים היום</p>
        ) : (
          <div className="space-y-2">
            {staffMap.map(([staffId, { name, tasks: staffTasks }]) => {
              const done = staffTasks.filter((t) => t.status === "completed").length;
              const total = staffTasks.length;
              const pct = total > 0 ? (done / total) * 100 : 0;
              const currentTask = staffTasks.find((t) => t.status === "in_progress");
              const hasOverdue = staffTasks.some((t) => {
                if (t.status !== "in_progress" || !t.started_at) return false;
                return (Date.now() - new Date(t.started_at).getTime()) / 60000 > t.standard_minutes * 1.15;
              });

              return (
                <div key={staffId} className={`rounded-xl border p-3 ${hasOverdue ? "border-destructive/50 bg-destructive/5" : "border-border"}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      {name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-sm">{name}</p>
                        {hasOverdue && (
                          <span className="status-badge status-overdue text-[10px]">
                            <AlertTriangle size={10} /> SLA
                          </span>
                        )}
                      </div>
                      {currentTask ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin size={11} />
                          <span>{currentTask.location_name}</span>
                          <span>·</span>
                          <span className="mono">{currentTask.task_name}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {done === total ? t("manager.allCompleted") : t("manager.waiting")}
                        </p>
                      )}
                    </div>
                    <div className="w-20 text-left">
                      <p className="text-xs text-muted-foreground mono mb-0.5">{done}/{total}</p>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Break-Fix Tab ─── */
const BreakfixTab = ({ locations, onSubmit, tickets }: {
  locations: LocationOption[];
  onSubmit: (locationId: string, description: string, priority?: "urgent" | "high" | "normal") => Promise<void>;
  tickets: ReturnType<typeof useSupervisorData>["tickets"];
}) => {
  const { t } = useI18n();
  const [selectedLocation, setSelectedLocation] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"urgent" | "high" | "normal">("normal");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!selectedLocation || !description.trim()) return;
    setSending(true);
    try {
      await onSubmit(selectedLocation, description, priority);
      toast({ title: "✓ " + t("supervisor.breakFixSent") });
      setSelectedLocation("");
      setDescription("");
      setPriority("normal");
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="animate-slide-up space-y-4">
      {/* Existing tickets */}
      {tickets.length > 0 && (
        <div className="task-card">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <Zap size={16} className="text-warning" />
            תקלות היום ({tickets.length})
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {tickets.map((ticket) => (
              <div key={ticket.id} className={`rounded-xl border p-3 ${
                ticket.status === "open" ? "border-warning/50 bg-warning/5" :
                ticket.status === "resolved" || ticket.status === "closed" ? "border-success/50 bg-success/5" :
                "border-border"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{ticket.location_name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    ticket.priority === "urgent" ? "bg-destructive/15 text-destructive" :
                    ticket.priority === "high" ? "bg-warning/15 text-warning" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {ticket.priority === "urgent" ? "דחוף" : ticket.priority === "high" ? "גבוה" : "רגיל"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{ticket.description}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(ticket.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className={`text-[10px] font-semibold ${
                    ticket.status === "resolved" || ticket.status === "closed" ? "text-success" :
                    ticket.status === "in_progress" ? "text-info" : "text-warning"
                  }`}>
                    {ticket.status === "open" ? "פתוח" :
                     ticket.status === "assigned" ? "שובץ" :
                     ticket.status === "in_progress" ? "בטיפול" :
                     ticket.status === "resolved" ? "נפתר" : "סגור"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create new */}
      <div className="task-card">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={20} className="text-warning" />
          <h2 className="font-bold">{t("supervisor.breakFix")} חדשה</h2>
        </div>

        <label className="block mb-4">
          <span className="text-sm font-medium text-muted-foreground mb-1.5 block">{t("supervisor.location")}</span>
          <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">{t("supervisor.selectLocation")}</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </label>

        <label className="block mb-4">
          <span className="text-sm font-medium text-muted-foreground mb-1.5 block">עדיפות</span>
          <div className="flex gap-2">
            {(["normal", "high", "urgent"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  priority === p
                    ? p === "urgent" ? "border-destructive bg-destructive/10 text-destructive"
                    : p === "high" ? "border-warning bg-warning/10 text-warning"
                    : "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {p === "urgent" ? "דחוף" : p === "high" ? "גבוה" : "רגיל"}
              </button>
            ))}
          </div>
        </label>

        <label className="block mb-4">
          <span className="text-sm font-medium text-muted-foreground mb-1.5 block">{t("supervisor.description")}</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder={t("supervisor.describeIssue")} rows={3}
            className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
        </label>

        <button onClick={handleSubmit} disabled={!selectedLocation || !description.trim() || sending}
          className="btn-action-danger w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          {t("supervisor.sendBreakFix")}
        </button>
      </div>
    </div>
  );
};

/* ─── Audit Tab ─── */
const AuditTab = ({ tasks, audits, onSubmit }: {
  tasks: SupervisorTask[];
  audits: ReturnType<typeof useSupervisorData>["audits"];
  onSubmit: (taskId: string, scores: Record<string, number>, notes: string) => Promise<void>;
}) => {
  const { t } = useI18n();
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const [selectedTask, setSelectedTask] = useState("");
  const [ratings, setRatings] = useState({ floor: 0, surfaces: 0, bins: 0, odor: 0, supplies: 0 });
  const [auditNotes, setAuditNotes] = useState("");
  const [sending, setSending] = useState(false);

  const categories = [
    { key: "floor" as const, label: t("audit.floor") },
    { key: "surfaces" as const, label: t("audit.surfaces") },
    { key: "bins" as const, label: t("audit.bins") },
    { key: "odor" as const, label: t("audit.odor") },
    { key: "supplies" as const, label: t("audit.supplies") },
  ];

  const ratedCount = Object.values(ratings).filter((v) => v > 0).length;
  const isAllRated = ratedCount === 5;
  const avgScore = isAllRated ? Object.values(ratings).reduce((s, v) => s + v, 0) / 5 : 0;
  const auditFailed = isAllRated && avgScore < 3.0;

  const handleSubmit = async () => {
    if (!selectedTask || !isAllRated) return;
    setSending(true);
    try {
      await onSubmit(selectedTask, ratings, auditNotes);
      toast({ title: "✓ " + t("supervisor.auditSent") });
      setSelectedTask("");
      setRatings({ floor: 0, surfaces: 0, bins: 0, odor: 0, supplies: 0 });
      setAuditNotes("");
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} onClick={() => onChange(star)} className="transition-colors">
            <Star size={22} className={star <= value ? "text-accent fill-accent" : "text-muted"} />
          </button>
        ))}
      </div>
    </div>
  );

  // 7-day audit trends grouped by staff
  const staffTrends = useMemo(() => {
    const map: Record<string, { name: string; scores: number[] }> = {};
    // Group audits by staff via task mapping
    audits.forEach((a) => {
      const task = tasks.find((t) => t.id === a.assigned_task_id);
      const staffName = task?.staff_name || "לא ידוע";
      const staffId = task?.staff_user_id || a.id;
      if (!map[staffId]) map[staffId] = { name: staffName, scores: [] };
      map[staffId].scores.push(a.total_score);
    });
    return Object.values(map).map(({ name, scores }) => ({
      name,
      avg: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
      count: scores.length,
    }));
  }, [audits, tasks]);

  return (
    <div className="animate-slide-up space-y-4">
      {/* Audit Trends */}
      {staffTrends.length > 0 && (
        <div className="task-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-info" />
            <h3 className="font-bold text-sm">{t("supervisor.qualityCheck")} — מגמת 7 ימים</h3>
          </div>
          <div className="space-y-2">
            {staffTrends.map(({ name, avg, count }) => (
              <div key={name} className="flex items-center justify-between rounded-lg border border-border p-2">
                <span className="text-sm font-medium">{name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{count} ביקורות</span>
                  <span className={`text-sm font-bold mono ${
                    avg >= 4 ? "text-success" : avg >= 3 ? "text-warning" : "text-destructive"
                  }`}>
                    {avg}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit New Audit */}
      <div className="task-card">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardCheck size={20} className="text-info" />
          <h2 className="font-bold">{t("supervisor.qualityCheck")}</h2>
        </div>

        <label className="block mb-4">
          <span className="text-sm font-medium text-muted-foreground mb-1.5 block">{t("supervisor.selectCompleted")}</span>
          <select value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)}
            className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">{t("supervisor.selectTask")}</option>
            {completedTasks.map((t) => (
              <option key={t.id} value={t.id}>{t.task_name} — {t.staff_name} ({t.location_name})</option>
            ))}
          </select>
        </label>

        {selectedTask && (
          <>
            <div className="border-t border-border pt-4 space-y-1">
              {categories.map((cat) => (
                <StarRating
                  key={cat.key}
                  label={cat.label}
                  value={ratings[cat.key]}
                  onChange={(v) => setRatings((r) => ({ ...r, [cat.key]: v }))}
                />
              ))}
            </div>

            {isAllRated && (
              <div className={`my-4 p-3 rounded-xl border-2 ${auditFailed ? "border-destructive bg-destructive/5" : "border-success bg-success/5"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{t("audit.avgScore")}</span>
                  <span className={`text-2xl font-bold mono ${auditFailed ? "text-destructive" : "text-success"}`}>
                    {avgScore.toFixed(1)} / 5.0
                  </span>
                </div>
                {auditFailed && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <ShieldAlert size={12} />
                    {t("audit.failedAudit")}
                  </p>
                )}
              </div>
            )}

            <label className="block my-4">
              <span className="text-sm font-medium text-muted-foreground mb-1.5 block">{t("supervisor.notes")}</span>
              <textarea value={auditNotes} onChange={(e) => setAuditNotes(e.target.value)}
                placeholder={t("supervisor.notes")} rows={2}
                className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
            </label>

            <button onClick={handleSubmit} disabled={!isAllRated || sending}
              className="btn-action-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {t("supervisor.submitAudit")}
            </button>
          </>
        )}
      </div>

      {/* Recent Audits */}
      {audits.length > 0 && (
        <div className="task-card">
          <h3 className="font-bold text-sm mb-3">ביקורות אחרונות</h3>
          <div className="space-y-2">
            {audits.slice(0, 10).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-2">
                <div>
                  <p className="text-sm font-medium">{a.task_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString("he-IL")} · {a.inspector_name}
                  </p>
                </div>
                <span className={`text-lg font-bold mono ${
                  a.total_score >= 4 ? "text-success" : a.total_score >= 3 ? "text-warning" : "text-destructive"
                }`}>
                  {a.total_score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorView;
