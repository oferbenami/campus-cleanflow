import { useState, useEffect } from "react";
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
  Image,
  ShieldAlert,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { mockZones, mockAssignments, mockStaff } from "@/data/mockData";
import DrillDownPanel from "@/components/manager/DrillDownPanel";
import { getPlannedMinutesUpToNow } from "@/data/staffSchedule";
import { useI18n } from "@/i18n/I18nContext";
import { toast } from "@/hooks/use-toast";

const SupervisorView = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"dashboard" | "breakfix" | "audit" | "stock">("dashboard");
  const [drillDown, setDrillDown] = useState<"staff" | "completed" | "inProgress" | "overdue" | "sla" | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs opacity-75 uppercase tracking-wider">CleanFlow</p>
          <h1 className="text-lg font-bold">{t("supervisor.panel")}</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4">
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
          {([
            { key: "dashboard" as const, icon: BarChart3, label: t("supervisor.dashboard") },
            { key: "breakfix" as const, icon: Zap, label: t("supervisor.breakFix") },
            { key: "stock" as const, icon: PackageOpen, label: t("supervisor.shortages") },
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

        {activeTab === "dashboard" && <DashboardTab onDrillDown={setDrillDown} />}
        {activeTab === "breakfix" && <BreakfixTab />}
        {activeTab === "stock" && <StockShortagesTab />}
        {activeTab === "audit" && <AuditTab />}
      </div>

      {drillDown && (
        <DrillDownPanel
          type={drillDown}
          assignments={mockAssignments}
          staff={mockStaff}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  );
};

/* ─── Dashboard Tab ─── */
const DashboardTab = ({ onDrillDown }: { onDrillDown: (type: "staff" | "completed" | "inProgress" | "overdue" | "sla") => void }) => {
  const { t } = useI18n();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const activeStaff = mockStaff.filter((s) => s.role === "staff");
  const totalTasks = mockAssignments.length;
  const completedTasks = mockAssignments.filter((a) => a.status === "completed").length;
  const inProgress = mockAssignments.filter((a) => a.status === "in_progress").length;
  const overdueTasks = mockAssignments.filter((a) => a.status === "overdue").length;
  const breakFixCount = mockAssignments.filter((a) => a.isBreakFix).length;
  const breakFixMinutes = mockAssignments
    .filter((a) => a.isBreakFix && a.elapsedMinutes)
    .reduce((s, a) => s + (a.elapsedMinutes || 0), 0);

  const { shouldBeCompleted } = getPlannedMinutesUpToNow(mockAssignments, now.getHours(), now.getMinutes());
  const completedMinutes = mockAssignments
    .filter((a) => a.status === "completed")
    .reduce((s, a) => s + (a.elapsedMinutes || a.task.estimatedMinutes), 0);
  const progressScore = shouldBeCompleted > 0
    ? Math.min(Math.round((completedMinutes / shouldBeCompleted) * 100), 100)
    : completedTasks > 0 ? 100 : 0;

  const staffGroups = activeStaff.map((staff) => ({
    staff,
    assignments: mockAssignments.filter((a) => a.staff.id === staff.id),
  }));

  return (
    <div className="animate-slide-up space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onDrillDown("staff")} className="kpi-card text-right hover:ring-2 hover:ring-info/30 transition-all cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-info/15 flex items-center justify-center">
              <Users size={20} className="text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeStaff.length}</p>
              <p className="text-xs text-muted-foreground">{t("manager.activeStaff")}</p>
            </div>
          </div>
        </button>
        <button onClick={() => onDrillDown("completed")} className="kpi-card text-right hover:ring-2 hover:ring-success/30 transition-all cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/15 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedTasks}/{totalTasks}</p>
              <p className="text-xs text-muted-foreground">{t("manager.tasksCompleted")}</p>
            </div>
          </div>
        </button>
        <button onClick={() => onDrillDown("inProgress")} className="kpi-card text-right hover:ring-2 hover:ring-accent/30 transition-all cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
              <Activity size={20} className="text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgress}</p>
              <p className="text-xs text-muted-foreground">{t("manager.inProgress")}</p>
            </div>
          </div>
        </button>
        <button onClick={() => onDrillDown("overdue")} className="kpi-card text-right hover:ring-2 hover:ring-destructive/30 transition-all cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/15 flex items-center justify-center">
              <AlertTriangle size={20} className="text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overdueTasks}</p>
              <p className="text-xs text-muted-foreground">{t("manager.overdue")}</p>
            </div>
          </div>
        </button>
      </div>

      <div className="kpi-card">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={16} className="text-warning" />
          <h3 className="text-sm font-semibold">{t("manager.breakFix.title")}</h3>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-2xl font-bold mono">{breakFixCount}</p>
            <p className="text-xs text-muted-foreground">{t("manager.breakFix.count")}</p>
          </div>
          <div>
            <p className="text-2xl font-bold mono text-warning">{breakFixMinutes}</p>
            <p className="text-xs text-muted-foreground">{t("manager.breakFix.minutes")}</p>
          </div>
        </div>
      </div>

      <div className="kpi-card">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={16} className="text-success" />
          <h3 className="text-sm font-semibold">{t("manager.progressScore")}</h3>
        </div>
        <div className="flex items-center gap-4">
          <p className={`text-3xl font-bold mono ${progressScore >= 90 ? "text-success" : progressScore >= 70 ? "text-warning" : "text-destructive"}`}>
            {progressScore}%
          </p>
          <Progress
            value={progressScore}
            className={`flex-1 h-3 ${progressScore >= 90 ? "[&>div]:bg-success" : progressScore >= 70 ? "[&>div]:bg-warning" : "[&>div]:bg-destructive"}`}
          />
        </div>
      </div>

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

        <div className="space-y-2">
          {staffGroups.map(({ staff, assignments }) => {
            const done = assignments.filter((a) => a.status === "completed").length;
            const total = assignments.length;
            const pct = total > 0 ? (done / total) * 100 : 0;
            const currentTask = assignments.find((a) => a.status === "in_progress");
            const hasOverdue = assignments.some((a) => a.status === "overdue");
            const staffBreakFix = assignments.filter((a) => a.isBreakFix).length;

            return (
              <div key={staff.id} className={`rounded-xl border p-3 ${hasOverdue ? "grid-row-overdue" : "border-border"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                    staff.status === "active" ? "bg-primary text-primary-foreground" :
                    staff.status === "break" ? "bg-accent text-accent-foreground" :
                    "bg-muted text-muted-foreground"
                  }`}>{staff.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-sm">{staff.name}</p>
                      {staff.status === "break" && (
                        <span className="status-badge status-pending text-[10px]">
                          <Coffee size={10} /> {t("status.break")}
                        </span>
                      )}
                      {hasOverdue && (
                        <span className="status-badge status-overdue text-[10px]">
                          <AlertTriangle size={10} /> SLA
                        </span>
                      )}
                      {staffBreakFix > 0 && (
                        <span className="status-badge bg-warning/15 text-warning text-[10px]">
                          <Zap size={10} /> {staffBreakFix}
                        </span>
                      )}
                    </div>
                    {currentTask ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <MapPin size={11} />
                        <span>{currentTask.task.zone.name}</span>
                        <span>·</span>
                        <Clock size={11} />
                        <span className="mono">{currentTask.elapsedMinutes} / {currentTask.task.estimatedMinutes} {t("common.minutes")}</span>
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
      </div>
    </div>
  );
};

/* ─── Break-Fix Tab ─── */
const BreakfixTab = () => {
  const { t } = useI18n();
  const [selectedZone, setSelectedZone] = useState("");
  const [breakfixDesc, setBreakfixDesc] = useState("");
  const [breakfixSent, setBreakfixSent] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = () => {
    setBreakfixSent(true);
    setTimeout(() => { setBreakfixSent(false); setSelectedZone(""); setBreakfixDesc(""); setImagePreview(null); }, 2000);
  };

  return (
    <div className="animate-slide-up space-y-4">
      <div className="task-card">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={20} className="text-warning" />
          <h2 className="font-bold">{t("supervisor.breakFix")}</h2>
        </div>
        <label className="block mb-4">
          <span className="text-sm font-medium text-muted-foreground mb-1.5 block">{t("supervisor.location")}</span>
          <select value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)}
            className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">{t("supervisor.selectLocation")}</option>
            {mockZones.map((z) => (
              <option key={z.id} value={z.id}>{z.name} ({z.wing}, {z.floor})</option>
            ))}
          </select>
        </label>
        <label className="block mb-4">
          <span className="text-sm font-medium text-muted-foreground mb-1.5 block">{t("supervisor.description")}</span>
          <textarea value={breakfixDesc} onChange={(e) => setBreakfixDesc(e.target.value)}
            placeholder={t("supervisor.describeIssue")} rows={3}
            className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <div className="mb-4">
          <span className="text-sm font-medium text-muted-foreground mb-1.5 block">{t("supervisor.attachImage")}</span>
          <label className="flex items-center justify-center gap-2 w-full py-4 rounded-lg border-2 border-dashed border-border hover:border-primary cursor-pointer transition-colors">
            <Camera size={20} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("supervisor.clickToCapture")}</span>
            <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
          </label>
          {imagePreview && (
            <div className="mt-3 relative">
              <img src={imagePreview} alt="" className="w-full h-48 object-cover rounded-lg border border-border" />
              <button onClick={() => setImagePreview(null)} className="absolute top-2 left-2 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center text-destructive text-sm font-bold">✕</button>
            </div>
          )}
        </div>
        {breakfixSent ? (
          <div className="flex items-center justify-center gap-2 py-4 text-success font-semibold">
            <CheckCircle2 size={20} /> {t("supervisor.breakFixSent")}
          </div>
        ) : (
          <button onClick={handleSubmit} disabled={!selectedZone || !breakfixDesc}
            className="btn-action-danger w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Send size={18} /> {t("supervisor.sendBreakFix")}
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── Stock Shortages Tab ─── */
const StockShortagesTab = () => {
  const { t } = useI18n();
  const [sentToWarehouse, setSentToWarehouse] = useState(false);

  const shortageMap: Record<string, { zones: string[]; staffNames: string[] }> = {};
  mockAssignments.forEach((a) => {
    if (a.stockLow && a.stockLow.length > 0) {
      a.stockLow.forEach((item) => {
        if (!shortageMap[item]) shortageMap[item] = { zones: [], staffNames: [] };
        const zoneName = a.task.zone.name;
        if (!shortageMap[item].zones.includes(zoneName)) shortageMap[item].zones.push(zoneName);
        if (!shortageMap[item].staffNames.includes(a.staff.name)) shortageMap[item].staffNames.push(a.staff.name);
      });
    }
  });
  const shortageItems = Object.entries(shortageMap);
  const stockLabels: Record<string, string> = {
    "Soap": t("stock.soap"), "Paper Towels": t("stock.paperTowels"),
    "Sanitizer": t("stock.sanitizer"), "Trash Bags": t("stock.trashBags"),
  };

  return (
    <div className="animate-slide-up space-y-4">
      <div className="task-card">
        <div className="flex items-center gap-2 mb-4">
          <PackageOpen size={20} className="text-warning" />
          <h2 className="font-bold">{t("supervisor.stockSummary")}</h2>
        </div>
        {shortageItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{t("supervisor.noShortages")}</p>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {shortageItems.map(([item, data]) => (
                <div key={item} className="rounded-xl border border-warning/30 bg-warning/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm flex items-center gap-2">
                      <PackageOpen size={14} className="text-warning" />
                      {stockLabels[item] || item}
                    </p>
                    <span className="status-badge bg-warning/15 text-warning text-[10px]">
                      {data.zones.length} {t("supervisor.locations")}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="flex items-center gap-1"><MapPin size={11} />{data.zones.join(", ")}</p>
                    <p className="flex items-center gap-1"><Users size={11} />{t("supervisor.reportedBy")}: {data.staffNames.join(", ")}</p>
                  </div>
                </div>
              ))}
            </div>
            {sentToWarehouse ? (
              <div className="flex items-center justify-center gap-2 py-4 text-success font-semibold">
                <CheckCircle2 size={20} /> {t("supervisor.sentToWarehouse")}
              </div>
            ) : (
              <button onClick={() => { setSentToWarehouse(true); setTimeout(() => setSentToWarehouse(false), 2500); }}
                className="btn-action-primary w-full flex items-center justify-center gap-2">
                <Truck size={18} /> {t("supervisor.sendToWarehouse")}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ─── Audit Tab (5-item checklist scoring) ─── */
const AuditTab = () => {
  const { t } = useI18n();
  const completedTasks = mockAssignments.filter((a) => a.status === "completed");
  const [selectedTask, setSelectedTask] = useState("");
  const [ratings, setRatings] = useState({ floor: 0, surfaces: 0, bins: 0, odor: 0, supplies: 0 });
  const [auditNotes, setAuditNotes] = useState("");
  const [auditSent, setAuditSent] = useState(false);
  const [showCAPA, setShowCAPA] = useState(false);
  const [capaTitle, setCapaTitle] = useState("");
  const [capaCreated, setCapaCreated] = useState(false);

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

  const handleSubmit = () => {
    setAuditSent(true);
    if (auditFailed) {
      setShowCAPA(true);
    } else {
      setTimeout(() => {
        setAuditSent(false); setSelectedTask("");
        setRatings({ floor: 0, surfaces: 0, bins: 0, odor: 0, supplies: 0 });
        setAuditNotes("");
      }, 2000);
    }
  };

  const handleCreateCAPA = () => {
    setCapaCreated(true);
    toast({ title: t("supervisor.capaCreated"), description: capaTitle });
    setTimeout(() => {
      setCapaCreated(false); setShowCAPA(false); setAuditSent(false); setSelectedTask("");
      setRatings({ floor: 0, surfaces: 0, bins: 0, odor: 0, supplies: 0 });
      setAuditNotes(""); setCapaTitle("");
    }, 2000);
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

  return (
    <div className="animate-slide-up space-y-4">
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
            {completedTasks.map((a) => (
              <option key={a.id} value={a.id}>{a.task.name} — {a.staff.name} ({a.completedAt})</option>
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

            {/* Average score display */}
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

            {/* CAPA dialog */}
            {showCAPA && (
              <div className="task-card border-2 border-destructive mb-4 animate-slide-up">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert size={18} className="text-destructive" />
                  <h3 className="font-bold text-sm">{t("supervisor.createCAPA")}</h3>
                </div>
                <input
                  type="text"
                  value={capaTitle}
                  onChange={(e) => setCapaTitle(e.target.value)}
                  placeholder={t("supervisor.createCAPA")}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {capaCreated ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-success font-semibold">
                    <CheckCircle2 size={18} /> {t("supervisor.capaCreated")}
                  </div>
                ) : (
                  <button
                    onClick={handleCreateCAPA}
                    disabled={!capaTitle.trim()}
                    className="btn-action-danger w-full flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <ShieldAlert size={16} /> {t("supervisor.createCAPA")}
                  </button>
                )}
              </div>
            )}

            {auditSent && !showCAPA ? (
              <div className="flex items-center justify-center gap-2 py-4 text-success font-semibold">
                <CheckCircle2 size={20} /> {t("supervisor.auditSent")}
              </div>
            ) : !showCAPA && (
              <button onClick={handleSubmit} disabled={!isAllRated}
                className="btn-action-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <Send size={18} /> {t("supervisor.submitAudit")}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SupervisorView;
