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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nContext";

/* ─── Types ─── */
interface LocationRow {
  id: string;
  name: string;
  level_type: string;
  space_type: string | null;
  parent_location_id: string | null;
  nfc_tag_uid: string | null;
  is_active: boolean;
  site_id: string;
}

type Level = "site" | "building" | "floor" | "zone" | "room";

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

/* ─── Main Component ─── */
const MasterDataTab = () => {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [path, setPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "מבנה הקמפוס" },
  ]);

  const currentParentId = path[path.length - 1].id;

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
    setPath((p) => [...p, { id: loc.id, name: loc.name }]);
  };

  const navigateTo = (idx: number) => {
    setPath((p) => p.slice(0, idx + 1));
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

      {/* Location list */}
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-xl" />
          ))}
        </div>
      ) : locations.length === 0 ? (
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
                      <span>{loc.space_type}</span>
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
