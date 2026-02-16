import { useState } from "react";
import {
  Users,
  Phone,
  Shield,
  CalendarPlus,
  ChevronLeft,
  CheckCircle2,
  Sun,
  Moon,
  ClipboardList,
  Send,
  Plus,
  Trash2,
  UserPlus,
  Building,
  ArrowLeft,
  Database,
} from "lucide-react";
import { mockStaff, mockTasks, type StaffMember, type TaskTemplate } from "@/data/mockData";
import ZonePlanningTab from "@/components/property-manager/ZonePlanningTab";
import MasterDataTab from "@/components/property-manager/MasterDataTab";

type PMTab = "staff" | "planning" | "assign" | "masterdata";

const PropertyManagerView = () => {
  const [activeTab, setActiveTab] = useState<PMTab>("staff");

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs opacity-75 uppercase tracking-wider">CleanFlow</p>
            <h1 className="text-xl font-bold">מנהל נכס</h1>
          </div>
          <div className="text-left">
            <p className="text-xs opacity-75">תאריך</p>
            <p className="text-sm font-semibold mono">15 בפבר׳ 2026</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
          <button
            onClick={() => setActiveTab("staff")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "staff" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Users size={16} />
            רשימת עובדים
          </button>
          <button
            onClick={() => setActiveTab("planning")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "planning" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <CalendarPlus size={16} />
            תכנון מחר
          </button>
          <button
            onClick={() => setActiveTab("assign")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "assign" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <ClipboardList size={16} />
            שיבוץ משימות
          </button>
          <button
            onClick={() => setActiveTab("masterdata")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "masterdata" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Database size={16} />
            נכסים
          </button>
        </div>

        {activeTab === "staff" && <StaffListTab />}
        {activeTab === "planning" && <ShiftPlanningTab />}
        {activeTab === "assign" && <ZonePlanningTab />}
        {activeTab === "masterdata" && <MasterDataTab />}
      </div>
    </div>
  );
};

/* ─── Staff List Tab ─── */
const StaffListTab = () => {
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const allStaff = mockStaff;

  const statusLabels: Record<string, { label: string; className: string }> = {
    active: { label: "פעיל", className: "status-active" },
    idle: { label: "לא פעיל", className: "status-pending" },
    break: { label: "הפסקה", className: "bg-accent/15 text-accent-foreground" },
    offline: { label: "לא במשמרת", className: "bg-muted text-muted-foreground" },
  };

  const roleLabels: Record<string, string> = {
    staff: "עובד ניקיון",
    supervisor: "מפקח",
    manager: "מנהל",
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="kpi-card text-center">
          <p className="text-2xl font-bold">{allStaff.length}</p>
          <p className="text-xs text-muted-foreground">סה״כ עובדים</p>
        </div>
        <div className="kpi-card text-center">
          <p className="text-2xl font-bold text-success">{allStaff.filter((s) => s.status === "active").length}</p>
          <p className="text-xs text-muted-foreground">פעילים</p>
        </div>
        <div className="kpi-card text-center">
          <p className="text-2xl font-bold text-warning">{allStaff.filter((s) => s.status === "break" || s.status === "idle").length}</p>
          <p className="text-xs text-muted-foreground">הפסקה/לא פעיל</p>
        </div>
        <div className="kpi-card text-center">
          <p className="text-2xl font-bold text-muted-foreground">{allStaff.filter((s) => s.status === "offline").length}</p>
          <p className="text-xs text-muted-foreground">לא במשמרת</p>
        </div>
      </div>

      {/* Staff table */}
      <div className="task-card overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold flex items-center gap-2">
            <Users size={18} />
            רשימת עובדים
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right">
              <th className="py-2 px-3 text-xs text-muted-foreground font-medium">עובד</th>
              <th className="py-2 px-3 text-xs text-muted-foreground font-medium">תפקיד</th>
              <th className="py-2 px-3 text-xs text-muted-foreground font-medium">טלפון</th>
              <th className="py-2 px-3 text-xs text-muted-foreground font-medium">מס׳ עובד (ביטחון)</th>
              <th className="py-2 px-3 text-xs text-muted-foreground font-medium">סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {allStaff.map((s) => {
              const status = statusLabels[s.status] || statusLabels.offline;
              return (
                <tr
                  key={s.id}
                  className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedStaff(s)}
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                        s.status === "active" ? "bg-primary text-primary-foreground" :
                        s.status === "break" ? "bg-accent text-accent-foreground" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {s.avatar}
                      </div>
                      <span className="font-semibold">{s.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-xs">{roleLabels[s.role] || s.role}</td>
                  <td className="py-3 px-3 mono text-xs">{s.phone || "-"}</td>
                  <td className="py-3 px-3 mono text-xs flex items-center gap-1">
                    <Shield size={12} className="text-muted-foreground" />
                    {s.securityBadgeNumber || "-"}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`status-badge text-[10px] ${status.className}`}>{status.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Staff detail modal */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">פרטי עובד</h2>
              <button onClick={() => setSelectedStaff(null)} className="px-3 py-1.5 rounded-lg bg-muted text-sm font-medium">סגור</button>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                {selectedStaff.avatar}
              </div>
              <div>
                <p className="text-xl font-bold">{selectedStaff.name}</p>
                <p className="text-sm text-muted-foreground">{roleLabels[selectedStaff.role]}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Phone size={18} className="text-info" />
                <div>
                  <p className="text-xs text-muted-foreground">טלפון</p>
                  <p className="font-semibold mono">{selectedStaff.phone || "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Shield size={18} className="text-accent" />
                <div>
                  <p className="text-xs text-muted-foreground">מספר עובד (בקרת ביטחון קמפוס)</p>
                  <p className="font-semibold mono">{selectedStaff.securityBadgeNumber || "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Building size={18} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">סטטוס נוכחי</p>
                  <span className={`status-badge text-[10px] ${(statusLabels[selectedStaff.status] || statusLabels.offline).className}`}>
                    {(statusLabels[selectedStaff.status] || statusLabels.offline).label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Shift Planning Tab ─── */
interface ShiftPlan {
  staffId: string;
  shift: "morning" | "evening";
}

const ShiftPlanningTab = () => {
  const staffOnly = mockStaff.filter((s) => s.role === "staff");
  const [plans, setPlans] = useState<ShiftPlan[]>([]);
  const [saved, setSaved] = useState(false);

  const toggleShift = (staffId: string, shift: "morning" | "evening") => {
    setPlans((prev) => {
      const exists = prev.find((p) => p.staffId === staffId && p.shift === shift);
      if (exists) {
        return prev.filter((p) => !(p.staffId === staffId && p.shift === shift));
      }
      return [...prev, { staffId, shift }];
    });
  };

  const isPlanned = (staffId: string, shift: "morning" | "evening") =>
    plans.some((p) => p.staffId === staffId && p.shift === shift);

  const morningCount = plans.filter((p) => p.shift === "morning").length;
  const eveningCount = plans.filter((p) => p.shift === "evening").length;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="kpi-card">
        <h2 className="font-bold mb-1 flex items-center gap-2">
          <CalendarPlus size={18} />
          תכנון משמרות — מחר (16 בפבר׳ 2026)
        </h2>
        <p className="text-xs text-muted-foreground">סמן עובדים למשמרת בוקר ו/או ערב</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="kpi-card text-center">
          <Sun size={20} className="mx-auto mb-1 text-warning" />
          <p className="text-2xl font-bold">{morningCount}</p>
          <p className="text-xs text-muted-foreground">משמרת בוקר</p>
        </div>
        <div className="kpi-card text-center">
          <Moon size={20} className="mx-auto mb-1 text-info" />
          <p className="text-2xl font-bold">{eveningCount}</p>
          <p className="text-xs text-muted-foreground">משמרת ערב</p>
        </div>
      </div>

      <div className="task-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right">
              <th className="py-2 px-3 text-xs text-muted-foreground font-medium">עובד</th>
              <th className="py-2 px-3 text-xs text-muted-foreground font-medium">מס׳ ביטחון</th>
              <th className="py-2 px-3 text-xs text-muted-foreground font-medium text-center">
                <span className="flex items-center justify-center gap-1"><Sun size={14} /> בוקר</span>
              </th>
              <th className="py-2 px-3 text-xs text-muted-foreground font-medium text-center">
                <span className="flex items-center justify-center gap-1"><Moon size={14} /> ערב</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {staffOnly.map((s) => (
              <tr key={s.id} className="border-b border-border/50">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                      {s.avatar}
                    </div>
                    <span className="font-medium">{s.name}</span>
                  </div>
                </td>
                <td className="py-3 px-3 mono text-xs">{s.securityBadgeNumber}</td>
                <td className="py-3 px-3 text-center">
                  <button
                    onClick={() => toggleShift(s.id, "morning")}
                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                      isPlanned(s.id, "morning")
                        ? "border-warning bg-warning/15 text-warning"
                        : "border-border text-muted-foreground hover:border-warning/50"
                    }`}
                  >
                    {isPlanned(s.id, "morning") ? <CheckCircle2 size={20} /> : <Plus size={16} />}
                  </button>
                </td>
                <td className="py-3 px-3 text-center">
                  <button
                    onClick={() => toggleShift(s.id, "evening")}
                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                      isPlanned(s.id, "evening")
                        ? "border-info bg-info/15 text-info"
                        : "border-border text-muted-foreground hover:border-info/50"
                    }`}
                  >
                    {isPlanned(s.id, "evening") ? <CheckCircle2 size={20} /> : <Plus size={16} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {saved ? (
        <div className="flex items-center justify-center gap-2 py-4 text-success font-semibold">
          <CheckCircle2 size={20} /> תכנון נשמר!
        </div>
      ) : (
        <button
          onClick={handleSave}
          disabled={plans.length === 0}
          className="btn-action-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={18} /> שמור תכנון
        </button>
      )}
    </div>
  );
};

export default PropertyManagerView;
