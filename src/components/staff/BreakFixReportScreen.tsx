import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, MapPin, ArrowRight, Loader2, X } from "lucide-react";

interface Props {
  onClose: () => void;
  onSubmit: (params: {
    locationId: string;
    description: string;
    priority: "critical" | "urgent" | "high" | "normal" | "low";
    category: "spill" | "restroom" | "safety" | "damage" | "equipment" | "other";
  }) => Promise<void>;
  submitting?: boolean;
  /** Pre-fill location from current task */
  currentLocationId?: string;
  currentLocationName?: string;
}

const categoryOptions = [
  { key: "spill" as const, label: "שפיכה / לכלוך", emoji: "💧" },
  { key: "restroom" as const, label: "שירותים", emoji: "🚻" },
  { key: "safety" as const, label: "בטיחות", emoji: "⚠️" },
  { key: "damage" as const, label: "נזק / שבר", emoji: "🔨" },
  { key: "equipment" as const, label: "ציוד תקול", emoji: "🔧" },
  { key: "other" as const, label: "אחר", emoji: "📋" },
];

const priorityOptions = [
  { key: "critical" as const, label: "קריטי", color: "border-destructive bg-destructive/10 text-destructive" },
  { key: "urgent" as const, label: "דחוף", color: "border-warning bg-warning/10 text-warning" },
  { key: "normal" as const, label: "רגיל", color: "border-primary bg-primary/10 text-primary" },
];

const BreakFixReportScreen = ({ onClose, onSubmit, submitting, currentLocationId, currentLocationName }: Props) => {
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState(currentLocationId || "");
  const [category, setCategory] = useState<typeof categoryOptions[number]["key"] | "">("");
  const [priority, setPriority] = useState<"critical" | "urgent" | "normal">("normal");
  const [description, setDescription] = useState("");
  const [step, setStep] = useState<1 | 2>(1); // 1 = category, 2 = details

  useEffect(() => {
    const fetchLocations = async () => {
      const { data } = await supabase
        .from("campus_locations")
        .select("id, name")
        .eq("is_active", true)
        .in("level_type", ["room", "zone"])
        .order("name");
      setLocations(data || []);
    };
    fetchLocations();
  }, []);

  const handleSubmit = async () => {
    if (!selectedLocation || !category || !description.trim()) return;
    await onSubmit({
      locationId: selectedLocation,
      description: description.trim(),
      priority,
      category,
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-destructive text-destructive-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} />
          <h1 className="text-lg font-bold">דיווח תקלה מיידית</h1>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg bg-destructive-foreground/10 hover:bg-destructive-foreground/20">
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 px-4 py-4 space-y-4">
        {step === 1 ? (
          <>
            {/* Step 1: Category selection */}
            <p className="text-sm font-semibold text-muted-foreground">מה סוג התקלה?</p>
            <div className="grid grid-cols-2 gap-3">
              {categoryOptions.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => { setCategory(cat.key); setStep(2); }}
                  className={`flex flex-col items-center gap-2 py-5 rounded-2xl border-2 transition-all hover:shadow-md ${
                    category === cat.key
                      ? "border-destructive bg-destructive/5 shadow-sm"
                      : "border-border bg-card hover:border-muted-foreground/30"
                  }`}
                >
                  <span className="text-3xl">{cat.emoji}</span>
                  <span className="text-sm font-semibold">{cat.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Step 2: Details */}
            <button onClick={() => setStep(1)} className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground">
              <ArrowRight size={14} />
              חזרה לבחירת קטגוריה
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{categoryOptions.find(c => c.key === category)?.emoji}</span>
              <span className="font-bold text-lg">{categoryOptions.find(c => c.key === category)?.label}</span>
            </div>

            {/* Location */}
            <label className="block">
              <span className="text-sm font-medium text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                <MapPin size={14} />
                מיקום
              </span>
              {currentLocationId && currentLocationName ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-lg px-3 py-2.5 text-sm font-medium">{currentLocationName}</div>
                  <button onClick={() => setSelectedLocation("")} className="text-xs text-muted-foreground hover:text-foreground">שנה</button>
                </div>
              ) : (
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">בחר מיקום</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              )}
            </label>

            {/* Priority */}
            <label className="block">
              <span className="text-sm font-medium text-muted-foreground mb-1.5 block">דחיפות</span>
              <div className="flex gap-2">
                {priorityOptions.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPriority(p.key)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold border-2 transition-colors ${
                      priority === p.key ? p.color : "border-border text-muted-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </label>

            {/* Description */}
            <label className="block">
              <span className="text-sm font-medium text-muted-foreground mb-1.5 block">תיאור התקלה</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="תאר בקצרה את התקלה..."
                rows={3}
                className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </label>
          </>
        )}
      </div>

      {/* Submit button (step 2 only) */}
      {step === 2 && (
        <div className="px-4 pb-6 pt-2">
          <button
            onClick={handleSubmit}
            disabled={!selectedLocation || !description.trim() || submitting}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-destructive text-destructive-foreground font-bold text-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]"
          >
            {submitting ? <Loader2 size={20} className="animate-spin" /> : <AlertTriangle size={20} />}
            שלח דיווח תקלה
          </button>
        </div>
      )}
    </div>
  );
};

export default BreakFixReportScreen;
