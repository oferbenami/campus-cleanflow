import { useState } from "react";
import {
  Building,
  Layers,
  MapPin,
  DoorOpen,
  Plus,
  Trash2,
  ChevronLeft,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { SITE_ID } from "@/hooks/usePropertyManagerData";
import type { Database } from "@/integrations/supabase/types";

type LocationLevel = Database["public"]["Enums"]["location_level"];
type SpaceType = Database["public"]["Enums"]["space_type"];

interface LocationRow {
  id: string;
  name: string;
  level_type: LocationLevel;
  space_type: SpaceType | null;
  parent_location_id: string | null;
  nfc_tag_uid: string | null;
  is_active: boolean;
  site_id: string;
}

const levelIcons: Record<string, React.ReactNode> = {
  building: <Building size={16} className="text-info" />,
  wing: <Layers size={16} className="text-warning" />,
  floor: <Layers size={16} className="text-success" />,
  zone: <MapPin size={16} className="text-accent" />,
  room: <DoorOpen size={16} className="text-primary" />,
};

const levelLabels: Record<string, string> = {
  building: "בניין",
  wing: "אגף",
  floor: "קומה",
  zone: "אזור",
  room: "חדר",
};

const childLevelOptions: Record<string, LocationLevel[]> = {
  root: ["building"],
  building: ["wing", "floor"],
  wing: ["floor", "zone"],
  floor: ["zone", "room"],
  zone: ["room"],
  room: [],
};

const spaceTypeLabels: Record<SpaceType, string> = {
  office: "משרד",
  meeting_room: "חדר ישיבות",
  restroom: "שירותים",
  kitchenette: "מטבחון",
  lobby: "לובי",
  other: "אחר",
};

const MasterDataTab = () => {
  const qc = useQueryClient();
  const [path, setPath] = useState<{ id: string | null; name: string; levelType: string }[]>([
    { id: null, name: "מבנה הקמפוס", levelType: "root" },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState<LocationLevel>("building");
  const [newSpaceType, setNewSpaceType] = useState<SpaceType>("other");
  const [newNfc, setNewNfc] = useState("");
  const [saving, setSaving] = useState(false);

  const currentParentId = path[path.length - 1].id;
  const currentLevelType = path[path.length - 1].levelType;
  const allowedChildren = childLevelOptions[currentLevelType] || [];

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["campus-locations", currentParentId],
    queryFn: async () => {
      let query = supabase
        .from("campus_locations")
        .select("id, name, level_type, space_type, parent_location_id, nfc_tag_uid, is_active, site_id")
        .order("name");

      if (currentParentId) {
        query = query.eq("parent_location_id", currentParentId);
      } else {
        query = query.is("parent_location_id", null);
      }

      const { data } = await query;
      return (data || []) as LocationRow[];
    },
  });

  const drillDown = (loc: LocationRow) => {
    setPath((p) => [...p, { id: loc.id, name: loc.name, levelType: loc.level_type }]);
    setShowAdd(false);
  };

  const navigateTo = (idx: number) => {
    setPath((p) => p.slice(0, idx + 1));
    setShowAdd(false);
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("campus_locations").delete().eq("id", id);
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "נמחק בהצלחה" });
    qc.invalidateQueries({ queryKey: ["campus-locations", currentParentId] });
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("campus_locations").insert({
      name: newName.trim(),
      level_type: newLevel,
      space_type: newSpaceType,
      parent_location_id: currentParentId,
      nfc_tag_uid: newNfc.trim() || null,
      site_id: SITE_ID,
    });
    setSaving(false);
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "נוצר בהצלחה" });
    setNewName("");
    setNewNfc("");
    setShowAdd(false);
    qc.invalidateQueries({ queryKey: ["campus-locations", currentParentId] });
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs flex-wrap mb-4">
        {path.map((item, idx) => (
          <span key={idx} className="flex items-center gap-1">
            {idx > 0 && <ChevronLeft size={12} className="text-muted-foreground" />}
            <button
              onClick={() => navigateTo(idx)}
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

      {/* Add button */}
      {allowedChildren.length > 0 && !showAdd && (
        <button
          onClick={() => {
            setNewLevel(allowedChildren[0]);
            setShowAdd(true);
          }}
          className="btn-action-primary w-full flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={16} /> הוסף {allowedChildren.map((l) => levelLabels[l]).join(" / ")}
        </button>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="task-card space-y-3 border-2 border-primary/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">הוספת פריט חדש</h3>
            <button onClick={() => setShowAdd(false)} className="p-1 rounded hover:bg-muted">
              <X size={16} />
            </button>
          </div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="שם הפריט"
            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">סוג רמה</label>
              <select
                value={newLevel}
                onChange={(e) => setNewLevel(e.target.value as LocationLevel)}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm"
              >
                {allowedChildren.map((l) => (
                  <option key={l} value={l}>{levelLabels[l]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">סוג חלל</label>
              <select
                value={newSpaceType}
                onChange={(e) => setNewSpaceType(e.target.value as SpaceType)}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm"
              >
                {(Object.entries(spaceTypeLabels) as [SpaceType, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <input
            value={newNfc}
            onChange={(e) => setNewNfc(e.target.value)}
            placeholder="NFC Tag UID (אופציונלי)"
            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim() || saving}
            className="btn-action-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "שומר..." : "שמור"}
          </button>
        </div>
      )}

      {/* Location list */}
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded-xl" />)}
        </div>
      ) : locations.length === 0 && !showAdd ? (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">אין פריטים ברמה זו</p>
        </div>
      ) : (
        <div className="space-y-2">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="task-card flex items-center gap-3 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
              onClick={() => drillDown(loc)}
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                {levelIcons[loc.level_type] || <MapPin size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{loc.name}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{levelLabels[loc.level_type] || loc.level_type}</span>
                  {loc.space_type && loc.space_type !== "other" && (
                    <>
                      <span>·</span>
                      <span>{spaceTypeLabels[loc.space_type as SpaceType] || loc.space_type}</span>
                    </>
                  )}
                  {loc.nfc_tag_uid && (
                    <>
                      <span>·</span>
                      <span className="mono">NFC: {loc.nfc_tag_uid}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteItem(loc.id);
                }}
                className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
              </button>
              <ChevronLeft size={16} className="text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MasterDataTab;
