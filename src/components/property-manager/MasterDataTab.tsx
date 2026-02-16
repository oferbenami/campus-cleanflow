import { useState, useEffect } from "react";
import {
  Building,
  Layers,
  MapPin,
  DoorOpen,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Save,
  X,
  ArrowRight,
  Ruler,
  Users,
  Droplets,
  CookingPot,
  GlassWater,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nContext";

/* ─── Types ─── */
interface SiteRow { id: string; name: string; }
interface BuildingRow { id: string; name: string; site_id: string; address: string | null; }
interface FloorRow { id: string; name: string; building_id: string; floor_number: number; }
interface ZoneRow { id: string; name: string; site_id: string; building_id: string | null; floor_id: string | null; wing: string | null; floor: string | null; area_sqm: number | null; traffic_level: string; }
interface LocationRow { id: string; name: string; zone_id: string; room_type: string | null; area_sqm: number | null; traffic_level: string; space_category: string; floor_type: string; has_glass: boolean; has_active_kitchen: boolean; floor_id: string | null; protocol_id: string | null; }
interface ProtocolRow { id: string; name_he: string; space_category: string; }

type Level = "site" | "building" | "floor" | "zone" | "room";

const trafficOptions = [
  { value: "low", label: "נמוכה" },
  { value: "medium", label: "בינונית" },
  { value: "high", label: "גבוהה" },
  { value: "very_high", label: "גבוהה מאוד" },
];

const floorTypeOptions = [
  { value: "tile", label: "אריחים" },
  { value: "carpet", label: "שטיח" },
  { value: "wood", label: "עץ" },
  { value: "concrete", label: "בטון" },
  { value: "vinyl", label: "ויניל" },
  { value: "mixed", label: "משולב" },
];

const spaceCategoryOptions = [
  { value: "general", label: "כללי" },
  { value: "office", label: "משרד" },
  { value: "restroom", label: "שירותים" },
  { value: "lobby", label: "לובי" },
  { value: "laboratory", label: "מעבדה" },
  { value: "kitchen", label: "מטבח" },
  { value: "meeting_room", label: "חדר ישיבות" },
  { value: "server_room", label: "חדר שרתים" },
];

/* ─── Breadcrumb ─── */
const Breadcrumb = ({
  path,
  onNavigate,
}: {
  path: { level: Level; id: string; name: string }[];
  onNavigate: (idx: number) => void;
}) => (
  <div className="flex items-center gap-1 text-xs flex-wrap mb-4">
    {path.map((item, idx) => (
      <span key={idx} className="flex items-center gap-1">
        {idx > 0 && <ChevronLeft size={12} className="text-muted-foreground" />}
        <button
          onClick={() => onNavigate(idx)}
          className={`px-2 py-1 rounded-md transition-colors ${
            idx === path.length - 1
              ? "bg-primary text-primary-foreground font-bold"
              : "hover:bg-muted text-muted-foreground"
          }`}
        >
          {item.name}
        </button>
      </span>
    ))}
  </div>
);

/* ─── Quick Form Wrapper ─── */
const InlineForm = ({
  onClose,
  onSubmit,
  title,
  children,
  saving,
}: {
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  children: React.ReactNode;
  saving: boolean;
}) => (
  <div className="rounded-xl border-2 border-info/30 bg-info/5 p-4 space-y-3">
    <div className="flex items-center justify-between">
      <h4 className="font-bold text-sm">{title}</h4>
      <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X size={16} /></button>
    </div>
    {children}
    <button
      onClick={onSubmit}
      disabled={saving}
      className="btn-action-primary w-full flex items-center justify-center gap-2 !py-3 !text-sm disabled:opacity-50"
    >
      <Save size={14} />
      {saving ? "שומר..." : "שמור"}
    </button>
  </div>
);

/* ─── Main Component ─── */
const MasterDataTab = () => {
  const { t } = useI18n();
  const qc = useQueryClient();

  // Navigation state
  const [path, setPath] = useState<{ level: Level; id: string; name: string }[]>([
    { level: "site", id: "", name: "אתרים" },
  ]);
  const currentLevel = path[path.length - 1];

  const navigateTo = (idx: number) => setPath((p) => p.slice(0, idx + 1));
  const drillDown = (level: Level, id: string, name: string) =>
    setPath((p) => [...p, { level, id, name }]);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // ─── Sites ───
  const { data: sites = [] } = useQuery({
    queryKey: ["master-sites"],
    queryFn: async () => {
      const { data } = await supabase.from("sites").select("id, name").order("name");
      return (data || []) as SiteRow[];
    },
  });

  // ─── Buildings ───
  const selectedSiteId = path.find((p) => p.level === "building")
    ? path[path.findIndex((p) => p.level === "building") - 1]?.id
    : currentLevel.level === "site" && currentLevel.id
    ? currentLevel.id
    : null;

  const { data: buildings = [] } = useQuery({
    queryKey: ["master-buildings", selectedSiteId],
    queryFn: async () => {
      if (!selectedSiteId) return [];
      const { data } = await supabase.from("buildings").select("id, name, site_id, address").eq("site_id", selectedSiteId).order("name");
      return (data || []) as BuildingRow[];
    },
    enabled: !!selectedSiteId,
  });

  // ─── Floors ───
  const selectedBuildingId = (() => {
    const bIdx = path.findIndex((p) => p.level === "floor");
    if (bIdx > 0) return path[bIdx - 1].id;
    if (currentLevel.level === "building") return currentLevel.id;
    return null;
  })();

  const { data: floors = [] } = useQuery({
    queryKey: ["master-floors", selectedBuildingId],
    queryFn: async () => {
      if (!selectedBuildingId) return [];
      const { data } = await supabase.from("floors").select("id, name, building_id, floor_number").eq("building_id", selectedBuildingId).order("floor_number");
      return (data || []) as FloorRow[];
    },
    enabled: !!selectedBuildingId,
  });

  // ─── Zones ───
  const selectedFloorId = (() => {
    const fIdx = path.findIndex((p) => p.level === "zone");
    if (fIdx > 0) return path[fIdx - 1].id;
    if (currentLevel.level === "floor") return currentLevel.id;
    return null;
  })();

  const { data: zones = [] } = useQuery({
    queryKey: ["master-zones", selectedFloorId],
    queryFn: async () => {
      if (!selectedFloorId) return [];
      const { data } = await supabase.from("zones").select("id, name, site_id, building_id, floor_id, wing, floor, area_sqm, traffic_level").eq("floor_id", selectedFloorId).order("name");
      return (data || []) as ZoneRow[];
    },
    enabled: !!selectedFloorId,
  });

  // ─── Rooms (Locations) ───
  const selectedZoneId = (() => {
    const zIdx = path.findIndex((p) => p.level === "room");
    if (zIdx > 0) return path[zIdx - 1].id;
    if (currentLevel.level === "zone") return currentLevel.id;
    return null;
  })();

  const { data: rooms = [] } = useQuery({
    queryKey: ["master-rooms", selectedZoneId],
    queryFn: async () => {
      if (!selectedZoneId) return [];
      const { data } = await supabase.from("locations").select("id, name, zone_id, room_type, area_sqm, traffic_level, space_category, floor_type, has_glass, has_active_kitchen, floor_id, protocol_id").eq("zone_id", selectedZoneId).order("name");
      return (data || []) as LocationRow[];
    },
    enabled: !!selectedZoneId,
  });

  // ─── Protocols for dropdown ───
  const { data: protocols = [] } = useQuery({
    queryKey: ["master-protocols"],
    queryFn: async () => {
      const { data } = await supabase.from("cleaning_protocols").select("id, name_he, space_category");
      return (data || []) as ProtocolRow[];
    },
  });

  // ─── Form Fields State ───
  const [formData, setFormData] = useState<Record<string, any>>({});
  const resetForm = () => { setFormData({}); setShowForm(false); };

  const setField = (key: string, value: any) => setFormData((p) => ({ ...p, [key]: value }));

  // ─── Create Handlers ───
  const createSite = async () => {
    if (!formData.name?.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("sites").insert({ name: formData.name.trim() });
    setSaving(false);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "אתר נוצר" });
    qc.invalidateQueries({ queryKey: ["master-sites"] });
    resetForm();
  };

  const createBuilding = async () => {
    if (!formData.name?.trim() || !selectedSiteId) return;
    setSaving(true);
    const { error } = await supabase.from("buildings").insert({ name: formData.name.trim(), site_id: selectedSiteId, address: formData.address || null });
    setSaving(false);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "בניין נוצר" });
    qc.invalidateQueries({ queryKey: ["master-buildings", selectedSiteId] });
    resetForm();
  };

  const createFloor = async () => {
    if (!formData.name?.trim() || !selectedBuildingId) return;
    setSaving(true);
    const { error } = await supabase.from("floors").insert({ name: formData.name.trim(), building_id: selectedBuildingId, floor_number: parseInt(formData.floor_number || "0") });
    setSaving(false);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "קומה נוצרה" });
    qc.invalidateQueries({ queryKey: ["master-floors", selectedBuildingId] });
    resetForm();
  };

  const createZone = async () => {
    if (!formData.name?.trim() || !selectedFloorId) return;
    const siteId = path.find((p) => p.level === "building")
      ? path[0].id
      : path[path.findIndex((p) => p.level === "site")]?.id;
    const buildingId = path.find((p) => p.level === "floor")
      ? path[path.findIndex((p) => p.level === "floor") - 1].id
      : selectedBuildingId;
    setSaving(true);
    const { error } = await supabase.from("zones").insert({
      name: formData.name.trim(),
      site_id: siteId!,
      building_id: buildingId,
      floor_id: selectedFloorId,
      wing: formData.wing || null,
      area_sqm: formData.area_sqm ? parseFloat(formData.area_sqm) : null,
      traffic_level: formData.traffic_level || "medium",
    });
    setSaving(false);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "אזור נוצר" });
    qc.invalidateQueries({ queryKey: ["master-zones", selectedFloorId] });
    resetForm();
  };

  const createRoom = async () => {
    if (!formData.name?.trim() || !selectedZoneId) return;
    setSaving(true);
    const floorId = path.find((p) => p.level === "zone")
      ? path[path.findIndex((p) => p.level === "zone") - 1].id
      : selectedFloorId;
    const { error } = await supabase.from("locations").insert({
      name: formData.name.trim(),
      zone_id: selectedZoneId,
      room_type: formData.room_type || "General",
      area_sqm: formData.area_sqm ? parseFloat(formData.area_sqm) : null,
      traffic_level: formData.traffic_level || "medium",
      space_category: formData.space_category || "general",
      floor_type: formData.floor_type || "tile",
      has_glass: formData.has_glass || false,
      has_active_kitchen: formData.has_active_kitchen || false,
      floor_id: floorId,
      protocol_id: formData.protocol_id || null,
    });
    setSaving(false);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "חדר נוצר" });
    qc.invalidateQueries({ queryKey: ["master-rooms", selectedZoneId] });
    resetForm();
  };

  // ─── Delete Handlers ───
  const deleteItem = async (table: string, id: string, queryKey: any[]) => {
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "נמחק בהצלחה" });
    qc.invalidateQueries({ queryKey });
  };

  // ─── Determine what to render ───
  const renderLevel = () => {
    // Sites list
    if (path.length === 1 && !currentLevel.id) {
      return (
        <ItemList
          icon={<Building size={18} className="text-primary" />}
          title="אתרים"
          items={sites.map((s) => ({ id: s.id, name: s.name, subtitle: "" }))}
          onSelect={(id, name) => {
            setPath([{ level: "site", id, name }]);
          }}
          onDelete={(id) => deleteItem("sites", id, ["master-sites"])}
          emptyText="אין אתרים. הוסף אתר ראשון."
        />
      );
    }

    // Buildings of selected site
    if (currentLevel.level === "site" && currentLevel.id) {
      return (
        <ItemList
          icon={<Building size={18} className="text-info" />}
          title={`בניינים — ${currentLevel.name}`}
          items={buildings.map((b) => ({ id: b.id, name: b.name, subtitle: b.address || "" }))}
          onSelect={(id, name) => drillDown("building", id, name)}
          onDelete={(id) => deleteItem("buildings", id, ["master-buildings", selectedSiteId])}
          emptyText="אין בניינים. הוסף בניין ראשון."
        />
      );
    }

    // Floors of selected building
    if (currentLevel.level === "building") {
      return (
        <ItemList
          icon={<Layers size={18} className="text-warning" />}
          title={`קומות — ${currentLevel.name}`}
          items={floors.map((f) => ({ id: f.id, name: f.name, subtitle: `קומה ${f.floor_number}` }))}
          onSelect={(id, name) => drillDown("floor", id, name)}
          onDelete={(id) => deleteItem("floors", id, ["master-floors", selectedBuildingId])}
          emptyText="אין קומות. הוסף קומה ראשונה."
        />
      );
    }

    // Zones of selected floor
    if (currentLevel.level === "floor") {
      return (
        <ItemList
          icon={<MapPin size={18} className="text-success" />}
          title={`אזורים — ${currentLevel.name}`}
          items={zones.map((z) => ({
            id: z.id,
            name: z.name,
            subtitle: [z.wing && `אגף ${z.wing}`, z.area_sqm && `${z.area_sqm} מ״ר`, trafficOptions.find((t) => t.value === z.traffic_level)?.label].filter(Boolean).join(" · "),
          }))}
          onSelect={(id, name) => drillDown("zone", id, name)}
          onDelete={(id) => deleteItem("zones", id, ["master-zones", selectedFloorId])}
          emptyText="אין אזורים. הוסף אזור ראשון."
        />
      );
    }

    // Rooms of selected zone
    if (currentLevel.level === "zone") {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <DoorOpen size={18} className="text-accent" />
            <h3 className="font-bold text-sm">חדרים — {currentLevel.name}</h3>
          </div>
          {rooms.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">אין חדרים. הוסף חדר ראשון.</p>
          )}
          {rooms.map((r) => {
            const proto = protocols.find((p) => p.id === r.protocol_id);
            return (
              <div key={r.id} className="task-card flex items-start gap-3">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{r.name}</span>
                    <button onClick={() => deleteItem("locations", r.id, ["master-rooms", selectedZoneId])} className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    <span className="status-badge bg-muted text-muted-foreground">
                      {spaceCategoryOptions.find((s) => s.value === r.space_category)?.label || r.space_category}
                    </span>
                    <span className="status-badge bg-muted text-muted-foreground">
                      {floorTypeOptions.find((f) => f.value === r.floor_type)?.label || r.floor_type}
                    </span>
                    <span className="status-badge bg-muted text-muted-foreground">
                      תנועה: {trafficOptions.find((t) => t.value === r.traffic_level)?.label}
                    </span>
                    {r.area_sqm && (
                      <span className="status-badge bg-muted text-muted-foreground">{r.area_sqm} מ״ר</span>
                    )}
                    {r.has_glass && <span className="status-badge bg-info/15 text-info">זכוכית</span>}
                    {r.has_active_kitchen && <span className="status-badge bg-warning/15 text-warning">מטבח פעיל</span>}
                    {proto && <span className="status-badge bg-success/15 text-success">{proto.name_he}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return null;
  };

  // ─── Render form by level ───
  const renderForm = () => {
    // Site form
    if (path.length === 1 && !currentLevel.id) {
      return (
        <InlineForm title="אתר חדש" onClose={resetForm} onSubmit={createSite} saving={saving}>
          <input type="text" value={formData.name || ""} onChange={(e) => setField("name", e.target.value)} placeholder="שם האתר" className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </InlineForm>
      );
    }

    // Building form
    if (currentLevel.level === "site") {
      return (
        <InlineForm title="בניין חדש" onClose={resetForm} onSubmit={createBuilding} saving={saving}>
          <input type="text" value={formData.name || ""} onChange={(e) => setField("name", e.target.value)} placeholder="שם הבניין" className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <input type="text" value={formData.address || ""} onChange={(e) => setField("address", e.target.value)} placeholder="כתובת (אופציונלי)" className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </InlineForm>
      );
    }

    // Floor form
    if (currentLevel.level === "building") {
      return (
        <InlineForm title="קומה חדשה" onClose={resetForm} onSubmit={createFloor} saving={saving}>
          <input type="text" value={formData.name || ""} onChange={(e) => setField("name", e.target.value)} placeholder="שם הקומה (למשל: קומת קרקע)" className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <input type="number" value={formData.floor_number || ""} onChange={(e) => setField("floor_number", e.target.value)} placeholder="מספר קומה (0, 1, 2...)" className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </InlineForm>
      );
    }

    // Zone form
    if (currentLevel.level === "floor") {
      return (
        <InlineForm title="אזור חדש" onClose={resetForm} onSubmit={createZone} saving={saving}>
          <input type="text" value={formData.name || ""} onChange={(e) => setField("name", e.target.value)} placeholder="שם האזור" className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <input type="text" value={formData.wing || ""} onChange={(e) => setField("wing", e.target.value)} placeholder="אגף (אופציונלי)" className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">שטח (מ״ר)</label>
              <input type="number" value={formData.area_sqm || ""} onChange={(e) => setField("area_sqm", e.target.value)} placeholder="120" className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">רמת תנועה</label>
              <select value={formData.traffic_level || "medium"} onChange={(e) => setField("traffic_level", e.target.value)} className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {trafficOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </InlineForm>
      );
    }

    // Room form
    if (currentLevel.level === "zone") {
      return (
        <InlineForm title="חדר חדש" onClose={resetForm} onSubmit={createRoom} saving={saving}>
          <input type="text" value={formData.name || ""} onChange={(e) => setField("name", e.target.value)} placeholder="שם החדר" className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">קטגוריית חלל</label>
              <select value={formData.space_category || "general"} onChange={(e) => setField("space_category", e.target.value)} className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {spaceCategoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">סוג רצפה</label>
              <select value={formData.floor_type || "tile"} onChange={(e) => setField("floor_type", e.target.value)} className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {floorTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">שטח (מ״ר)</label>
              <input type="number" value={formData.area_sqm || ""} onChange={(e) => setField("area_sqm", e.target.value)} placeholder="50" className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">רמת תנועה</label>
              <select value={formData.traffic_level || "medium"} onChange={(e) => setField("traffic_level", e.target.value)} className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {trafficOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">סוג חדר</label>
            <input type="text" value={formData.room_type || ""} onChange={(e) => setField("room_type", e.target.value)} placeholder="חדר עבודה, חדר ישיבות..." className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">פרוטוקול ניקיון</label>
            <select value={formData.protocol_id || ""} onChange={(e) => setField("protocol_id", e.target.value || null)} className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">ללא — בחר פרוטוקול</option>
              {protocols.map((p) => <option key={p.id} value={p.id}>{p.name_he} ({p.space_category})</option>)}
            </select>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={formData.has_glass || false} onChange={(e) => setField("has_glass", e.target.checked)} className="rounded border-input" />
              <GlassWater size={14} className="text-info" />
              זכוכית
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={formData.has_active_kitchen || false} onChange={(e) => setField("has_active_kitchen", e.target.checked)} className="rounded border-input" />
              <CookingPot size={14} className="text-warning" />
              מטבח פעיל
            </label>
          </div>
        </InlineForm>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <Breadcrumb path={path.length === 1 && !path[0].id ? [{ level: "site", id: "", name: "אתרים" }] : path} onNavigate={(idx) => {
        if (idx === 0 && !path[0].id) setPath([{ level: "site", id: "", name: "אתרים" }]);
        else navigateTo(idx);
      }} />

      {renderLevel()}

      {showForm ? renderForm() : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus size={16} />
          {currentLevel.level === "site" && !currentLevel.id && "הוסף אתר"}
          {currentLevel.level === "site" && currentLevel.id && "הוסף בניין"}
          {currentLevel.level === "building" && "הוסף קומה"}
          {currentLevel.level === "floor" && "הוסף אזור"}
          {currentLevel.level === "zone" && "הוסף חדר"}
        </button>
      )}
    </div>
  );
};

/* ─── Reusable Item List ─── */
const ItemList = ({
  icon,
  title,
  items,
  onSelect,
  onDelete,
  emptyText,
}: {
  icon: React.ReactNode;
  title: string;
  items: { id: string; name: string; subtitle: string }[];
  onSelect: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  emptyText: string;
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <h3 className="font-bold text-sm">{title}</h3>
      <span className="text-xs text-muted-foreground">({items.length})</span>
    </div>
    {items.length === 0 && (
      <p className="text-sm text-muted-foreground text-center py-6">{emptyText}</p>
    )}
    {items.map((item) => (
      <div
        key={item.id}
        className="task-card flex items-center gap-3 cursor-pointer hover:shadow-md"
        onClick={() => onSelect(item.id, item.name)}
      >
        <div className="flex-1">
          <p className="font-semibold text-sm">{item.name}</p>
          {item.subtitle && <p className="text-xs text-muted-foreground">{item.subtitle}</p>}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors"
        >
          <Trash2 size={14} />
        </button>
        <ChevronLeft size={16} className="text-muted-foreground" />
      </div>
    ))}
  </div>
);

export default MasterDataTab;
