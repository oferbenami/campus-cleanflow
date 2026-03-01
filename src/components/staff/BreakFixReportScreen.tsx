import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, MapPin, ArrowRight, Loader2, X, Camera, UserCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  onClose: () => void;
  onSubmit: (params: {
    locationId: string;
    description: string;
    priority: "critical" | "urgent" | "high" | "normal" | "low";
    category: "spill" | "restroom" | "safety" | "damage" | "equipment" | "other";
    selfAssign?: boolean;
    photoUrl?: string;
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
  const [step, setStep] = useState<1 | 2>(1);
  const [selfAssign, setSelfAssign] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (): Promise<string | undefined> => {
    if (!photoFile) return undefined;
    setUploading(true);
    try {
      const ext = photoFile.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("incident-photos").upload(path, photoFile);
      if (error) throw error;
      const { data } = supabase.storage.from("incident-photos").getPublicUrl(path);
      return data.publicUrl;
    } catch (err) {
      console.error("Photo upload error:", err);
      return undefined;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedLocation || !category || !description.trim()) return;
    const photoUrl = await uploadPhoto();
    await onSubmit({
      locationId: selectedLocation,
      description: description.trim(),
      priority,
      category,
      selfAssign,
      photoUrl,
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

            {/* Photo */}
            <div>
              <span className="text-sm font-medium text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                <Camera size={14} />
                צילום (אופציונלי)
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoSelect}
              />
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="תצוגה מקדימה" className="w-full h-32 object-cover rounded-lg border border-border" />
                  <button
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    className="absolute top-1.5 left-1.5 p-1 rounded-full bg-background/80 hover:bg-background"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors flex items-center justify-center gap-2"
                >
                  <Camera size={16} />
                  לחץ לצילום או בחירת תמונה
                </button>
              )}
            </div>

            {/* Self-assign checkbox */}
            <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
              <Checkbox
                checked={selfAssign}
                onCheckedChange={(checked) => setSelfAssign(checked === true)}
                className="h-5 w-5"
              />
              <div className="flex items-center gap-2 flex-1">
                <UserCheck size={16} className="text-primary shrink-0" />
                <span className="text-sm font-semibold text-foreground">אני מטפל בזה בעצמי</span>
              </div>
            </label>
          </>
        )}
      </div>

      {/* Submit button (step 2 only) */}
      {step === 2 && (
        <div className="px-4 pb-6 pt-2">
          <button
            onClick={handleSubmit}
            disabled={!selectedLocation || !description.trim() || submitting || uploading}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-destructive text-destructive-foreground font-bold text-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]"
          >
            {(submitting || uploading) ? <Loader2 size={20} className="animate-spin" /> : <AlertTriangle size={20} />}
            {uploading ? "מעלה צילום..." : "שלח דיווח תקלה"}
          </button>
        </div>
      )}
    </div>
  );
};

export default BreakFixReportScreen;
