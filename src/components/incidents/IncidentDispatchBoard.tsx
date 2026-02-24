import { useState, useMemo, useEffect } from "react";
import { useIncidents, type Incident } from "@/hooks/useIncidents";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertTriangle, Clock, MapPin, User, Zap, Timer, ChevronDown,
  Shield, ArrowRight, CheckCircle2, XCircle, Loader2, Plus
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface StaffOption {
  id: string;
  full_name: string;
  avatar_initials: string | null;
}

const priorityConfig = {
  critical: { label: "קריטי", color: "bg-destructive text-destructive-foreground", dot: "bg-destructive" },
  urgent: { label: "דחוף", color: "bg-destructive/80 text-destructive-foreground", dot: "bg-destructive" },
  high: { label: "גבוה", color: "bg-warning/80 text-warning-foreground", dot: "bg-warning" },
  normal: { label: "רגיל", color: "bg-muted text-muted-foreground", dot: "bg-info" },
  low: { label: "נמוך", color: "bg-muted/60 text-muted-foreground", dot: "bg-muted-foreground" },
};

const categoryLabels: Record<string, string> = {
  spill: "שפיכה",
  restroom: "שירותים",
  safety: "בטיחות",
  damage: "נזק",
  equipment: "ציוד",
  other: "אחר",
};

const statusColumns = [
  { key: "pending_dispatch", label: "ממתין לשיבוץ", icon: Clock, color: "text-warning" },
  { key: "assigned", label: "שובץ", icon: User, color: "text-info" },
  { key: "in_progress", label: "בטיפול", icon: Zap, color: "text-accent" },
  { key: "escalated", label: "הסלמה", icon: Shield, color: "text-destructive" },
  { key: "resolved", label: "נפתר", icon: CheckCircle2, color: "text-success" },
];

const IncidentDispatchBoard = () => {
  const { user, role } = useAuth();
  const { incidents, byStatus, loading, assignIncident, resolveIncident, closeIncident, escalateIncident, reassignIncident, createIncident } = useIncidents();
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);

  // Fetch staff for assignment
  useEffect(() => {
    const fetchStaff = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_initials, role")
        .eq("role", "cleaning_staff");
      setStaff(data || []);
    };
    const fetchLocations = async () => {
      const { data: profile } = await supabase.from("profiles").select("site_id").eq("id", user?.id || "").single();
      const siteId = profile?.site_id || "37027ccd-c7d7-4d77-988d-6da914e347b4";
      const { data } = await supabase
        .from("campus_locations")
        .select("id, name")
        .eq("site_id", siteId)
        .eq("is_active", true)
        .in("level_type", ["room", "zone"])
        .order("name");
      setLocations(data || []);
    };
    if (user?.id) {
      fetchStaff();
      fetchLocations();
    }
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-primary" />
          <h2 className="text-lg font-bold">מרכז פיקוד אירועים</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {incidents.length} אירועים פתוחים
          </span>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          אירוע חדש
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-5 gap-2">
        {statusColumns.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="bg-card border rounded-lg p-3 text-center">
            <Icon size={16} className={`mx-auto mb-1 ${color}`} />
            <p className="text-2xl font-bold mono">{(byStatus[key] || []).length}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-5 gap-2 min-h-[400px]">
        {statusColumns.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="bg-muted/30 rounded-xl p-2 space-y-2">
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              <Icon size={14} className={color} />
              <span className="text-xs font-bold">{label}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{(byStatus[key] || []).length}</span>
            </div>
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {(byStatus[key] || []).map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  onClick={() => setSelectedIncident(incident)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
        <DialogContent className="max-w-lg">
          {selectedIncident && (
            <IncidentDetail
              incident={selectedIncident}
              staff={staff}
              canAssign={role === "supervisor" || role === "property_manager" || role === "campus_manager"}
              onAssign={async (userId) => {
                await assignIncident(selectedIncident.id, userId);
                toast({ title: "✓ אירוע שובץ" });
                setSelectedIncident(null);
              }}
              onResolve={async () => {
                await resolveIncident(selectedIncident.id);
                toast({ title: "✓ אירוע נפתר" });
                setSelectedIncident(null);
              }}
              onClose={async (reason) => {
                await closeIncident(selectedIncident.id, reason);
                toast({ title: "✓ אירוע נסגר" });
                setSelectedIncident(null);
              }}
              onEscalate={async () => {
                await escalateIncident(selectedIncident.id, selectedIncident.escalation_level + 1);
                toast({ title: "⬆️ אירוע הוסלם" });
                setSelectedIncident(null);
              }}
              onReassign={async (userId) => {
                await reassignIncident(selectedIncident.id, userId);
                toast({ title: "✓ אירוע שובץ מחדש" });
                setSelectedIncident(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Form Modal */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">דיווח אירוע חדש</DialogTitle>
          </DialogHeader>
          <CreateIncidentForm
            locations={locations}
            staff={staff}
            canAssign={role === "supervisor" || role === "property_manager"}
            onSubmit={async (params) => {
              await createIncident(params);
              toast({ title: "✓ אירוע נוצר" });
              setShowCreateForm(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Incident Card ──
const IncidentCard = ({ incident, onClick }: { incident: Incident; onClick: () => void }) => {
  const pConfig = priorityConfig[incident.priority];
  const slaMin = incident.response_sla_remaining_min ?? incident.resolution_sla_remaining_min;
  const isBreach = incident.is_response_breached || incident.is_resolution_breached;

  return (
    <button
      onClick={onClick}
      className={`w-full text-right rounded-lg border p-2.5 bg-card hover:ring-1 hover:ring-ring transition-all space-y-1.5 ${
        isBreach ? "border-destructive/50 ring-1 ring-destructive/30" : "border-border"
      } ${incident.escalation_level >= 2 ? "animate-pulse-slow" : ""}`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${pConfig.dot} ${isBreach ? "animate-pulse" : ""}`} />
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${pConfig.color}`}>
          {pConfig.label}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
          {categoryLabels[incident.category] || incident.category}
        </span>
      </div>

      <p className="text-xs font-semibold truncate">{incident.description}</p>

      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <MapPin size={9} />
        <span className="truncate">{incident.location_name}</span>
      </div>

      {slaMin !== null && (
        <div className={`flex items-center gap-1 text-[10px] font-mono font-bold ${
          isBreach ? "text-destructive" : slaMin < 5 ? "text-warning" : "text-muted-foreground"
        }`}>
          <Timer size={9} />
          {isBreach ? "חריגת SLA" : `${Math.ceil(slaMin)} דק׳`}
        </div>
      )}

      {incident.escalation_level > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-destructive font-bold">
          <Shield size={9} />
          הסלמה רמה {incident.escalation_level}
        </div>
      )}
    </button>
  );
};

// ── Incident Detail ──
const IncidentDetail = ({
  incident,
  staff,
  canAssign,
  onAssign,
  onResolve,
  onClose,
  onEscalate,
  onReassign,
}: {
  incident: Incident;
  staff: StaffOption[];
  canAssign: boolean;
  onAssign: (userId: string) => Promise<void>;
  onResolve: () => Promise<void>;
  onClose: (reason: string) => Promise<void>;
  onEscalate: () => Promise<void>;
  onReassign: (userId: string) => Promise<void>;
}) => {
  const [assignTo, setAssignTo] = useState("");
  const [closeReason, setCloseReason] = useState("");
  const [acting, setActing] = useState(false);
  const pConfig = priorityConfig[incident.priority];

  const handleAction = async (fn: () => Promise<void>) => {
    setActing(true);
    try { await fn(); } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
    setActing(false);
  };

  return (
    <div className="space-y-4 text-right">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`w-3 h-3 rounded-full mt-1 ${pConfig.dot}`} />
        <div className="flex-1">
          <p className="font-bold">{incident.description}</p>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${pConfig.color}`}>{pConfig.label}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{categoryLabels[incident.category]}</span>
            {incident.escalation_level > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-bold">
                הסלמה {incident.escalation_level}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3">
        <InfoItem label="מיקום" value={incident.location_name} />
        <InfoItem label="דיווח ע״י" value={incident.created_by_name} />
        <InfoItem label="שובץ ל" value={incident.assigned_to_name || "—"} />
        <InfoItem label="נוצר" value={new Date(incident.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })} />
        <InfoItem
          label="SLA תגובה"
          value={incident.assigned_at ? "✓ בוצע" : incident.is_response_breached ? "⚠️ חריגה!" : `${Math.ceil(incident.response_sla_remaining_min || 0)} דק׳`}
          highlight={incident.is_response_breached}
        />
        <InfoItem
          label="SLA פתרון"
          value={incident.resolved_at ? "✓ נפתר" : incident.is_resolution_breached ? "⚠️ חריגה!" : `${Math.ceil(incident.resolution_sla_remaining_min || 0)} דק׳`}
          highlight={incident.is_resolution_breached}
        />
      </div>

      {incident.photo_url && (
        <img src={incident.photo_url} alt="תמונה" className="rounded-lg max-h-40 object-cover w-full" />
      )}

      {/* Actions */}
      <div className="space-y-2 pt-2 border-t">
        {canAssign && incident.status === "pending_dispatch" && (
          <div className="flex gap-2">
            <Select value={assignTo} onValueChange={setAssignTo}>
              <SelectTrigger className="flex-1 text-xs">
                <SelectValue placeholder="בחר עובד..." />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              disabled={!assignTo || acting}
              onClick={() => handleAction(() => onAssign(assignTo))}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
            >
              שבץ
            </button>
          </div>
        )}

        {canAssign && (incident.status === "assigned" || incident.status === "in_progress") && (
          <div className="flex gap-2">
            <Select value={assignTo} onValueChange={setAssignTo}>
              <SelectTrigger className="flex-1 text-xs">
                <SelectValue placeholder="שבץ מחדש..." />
              </SelectTrigger>
              <SelectContent>
                {staff.filter(s => s.id !== incident.assigned_to_user_id).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              disabled={!assignTo || acting}
              onClick={() => handleAction(() => onReassign(assignTo))}
              className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-xs font-bold disabled:opacity-50"
            >
              שבץ מחדש
            </button>
          </div>
        )}

        <div className="flex gap-2">
          {incident.status !== "resolved" && incident.status !== "closed" && (
            <button
              disabled={acting}
              onClick={() => handleAction(onResolve)}
              className="flex-1 py-2 rounded-lg bg-success text-success-foreground text-xs font-bold disabled:opacity-50"
            >
              <CheckCircle2 size={14} className="inline mr-1" /> סמן כנפתר
            </button>
          )}
          {canAssign && incident.escalation_level < 2 && incident.status !== "resolved" && (
            <button
              disabled={acting}
              onClick={() => handleAction(onEscalate)}
              className="flex-1 py-2 rounded-lg bg-destructive/15 text-destructive text-xs font-bold disabled:opacity-50"
            >
              <Shield size={14} className="inline mr-1" /> הסלם
            </button>
          )}
        </div>

        {canAssign && incident.status === "resolved" && (
          <div className="flex gap-2">
            <input
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              placeholder="סיבת סגירה..."
              className="flex-1 border rounded-lg px-3 py-2 text-xs"
            />
            <button
              disabled={acting || !closeReason.trim()}
              onClick={() => handleAction(() => onClose(closeReason))}
              className="px-4 py-2 rounded-lg bg-muted text-foreground text-xs font-bold disabled:opacity-50"
            >
              סגור
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const InfoItem = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className={`rounded-lg border p-2 ${highlight ? "border-destructive/50 bg-destructive/5" : ""}`}>
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className={`text-xs font-semibold ${highlight ? "text-destructive" : ""}`}>{value}</p>
  </div>
);

// ── Create Incident Form ──
const CreateIncidentForm = ({
  locations,
  staff,
  canAssign,
  onSubmit,
}: {
  locations: { id: string; name: string }[];
  staff: StaffOption[];
  canAssign: boolean;
  onSubmit: (params: any) => Promise<void>;
}) => {
  const [locationId, setLocationId] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Incident["priority"]>("normal");
  const [category, setCategory] = useState<Incident["category"]>("other");
  const [assignToUserId, setAssignToUserId] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!locationId || !description.trim()) return;
    setSending(true);
    try {
      await onSubmit({
        locationId,
        description: description.trim(),
        priority,
        category,
        assignToUserId: assignToUserId || undefined,
      });
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message, variant: "destructive" });
    }
    setSending(false);
  };

  return (
    <div className="space-y-3 text-right">
      <div>
        <label className="text-xs font-semibold text-muted-foreground">מיקום</label>
        <Select value={locationId} onValueChange={setLocationId}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="בחר מיקום..." /></SelectTrigger>
          <SelectContent>
            {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground">קטגוריה</label>
        <Select value={category} onValueChange={(v) => setCategory(v as any)}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground">עדיפות</label>
        <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(priorityConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground">תיאור</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="תאר את האירוע..."
          className="w-full mt-1 border rounded-lg px-3 py-2 text-sm min-h-[80px] resize-none"
        />
      </div>

      {canAssign && (
        <div>
          <label className="text-xs font-semibold text-muted-foreground">שיבוץ ישיר (אופציונלי)</label>
          <Select value={assignToUserId} onValueChange={setAssignToUserId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="ממתין לשיבוץ..." /></SelectTrigger>
            <SelectContent>
              {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <button
        disabled={!locationId || !description.trim() || sending}
        onClick={handleSubmit}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50"
      >
        {sending ? <Loader2 size={16} className="mx-auto animate-spin" /> : "שלח אירוע"}
      </button>
    </div>
  );
};

export default IncidentDispatchBoard;
