import { useState } from "react";
import { ChevronLeft, PackageOpen, Minus, Plus, MapPin, Send } from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";

interface ShortageItem {
  key: string;
  label: string;
}

interface ShortageCategory {
  title: string;
  items: ShortageItem[];
}

const shortageCategories: ShortageCategory[] = [
  {
    title: "חומרים וציוד לצוות",
    items: [
      { key: "soap_staff", label: "סבון ידיים" },
      { key: "sanitizer_staff", label: "חומר חיטוי" },
      { key: "trash_bags", label: "שקיות אשפה" },
      { key: "mop_heads", label: "ראשי מגב" },
      { key: "gloves", label: "כפפות" },
      { key: "cleaning_cloths", label: "מטליות ניקוי" },
      { key: "floor_cleaner", label: "חומר לשטיפת רצפה" },
      { key: "glass_cleaner", label: "מנקה חלונות" },
      { key: "disinfectant_spray", label: "תרסיס חיטוי" },
    ],
  },
  {
    title: "חומרים לשימוש דיירים",
    items: [
      { key: "toilet_paper", label: "נייר טואלט" },
      { key: "paper_towels", label: "מגבות נייר" },
      { key: "soap_dispenser", label: "סבון למתקן" },
      { key: "air_freshener", label: "מפיג ריח" },
      { key: "seat_covers", label: "כיסויי אסלה" },
      { key: "hand_sanitizer", label: "ג׳ל אלכוהול" },
    ],
  },
  {
    title: "פרודוקטים לקפיטריות",
    items: [
      { key: "cups", label: "כוסות חד פעמיות" },
      { key: "napkins", label: "מפיות" },
      { key: "sugar", label: "סוכר" },
      { key: "stirrers", label: "בוחשנים" },
      { key: "tea_bags", label: "שקיקי תה" },
      { key: "coffee_capsules", label: "קפסולות קפה" },
      { key: "milk_portions", label: "מנות חלב" },
      { key: "plates", label: "צלחות חד פעמיות" },
    ],
  },
];

const locationOptions = [
  "מחסן קומתי",
  "מחסן מרכזי",
  "קפיטריה קומה 1",
  "קפיטריה קומה 2",
  "שירותים קומה 1",
  "שירותים קומה 2",
  "לובי ראשי",
];

interface SelectedItem {
  key: string;
  label: string;
  quantity: number;
}

interface Props {
  onClose: () => void;
  onSubmit: (items: SelectedItem[], location: string) => void;
  submitting?: boolean;
}

const ShortageReportScreen = ({ onClose, onSubmit, submitting }: Props) => {
  const { t } = useI18n();
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map());
  const [location, setLocation] = useState("מחסן קומתי");
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const toggleItem = (item: ShortageItem) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (next.has(item.key)) {
        next.delete(item.key);
      } else {
        next.set(item.key, { key: item.key, label: item.label, quantity: 1 });
      }
      return next;
    });
  };

  const updateQuantity = (key: string, delta: number) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(key);
      if (existing) {
        const newQty = Math.max(1, existing.quantity + delta);
        next.set(key, { ...existing, quantity: newQty });
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (selectedItems.size === 0) return;
    onSubmit(Array.from(selectedItems.values()), location);
  };

  const totalItems = selectedItems.size;

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-warning text-warning-foreground px-4 py-3 flex items-center gap-3">
        <button onClick={onClose} className="p-2 rounded-lg bg-black/10 hover:bg-black/20 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <PackageOpen size={20} />
          <h1 className="text-lg font-bold">דיווח חוסרים</h1>
        </div>
      </header>

      {/* Location selector */}
      <div className="px-4 py-3 border-b border-border">
        <button
          onClick={() => setShowLocationPicker(!showLocationPicker)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-border bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium">מיקום:</span>
            <span className="text-sm font-bold">{location}</span>
          </div>
          <ChevronLeft size={16} className={`text-muted-foreground transition-transform ${showLocationPicker ? "rotate-90" : "-rotate-90"}`} />
        </button>
        {showLocationPicker && (
          <div className="mt-2 space-y-1 animate-slide-up">
            {locationOptions.map((loc) => (
              <button
                key={loc}
                onClick={() => { setLocation(loc); setShowLocationPicker(false); }}
                className={`w-full text-right px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  location === loc
                    ? "bg-warning/15 text-warning font-bold border border-warning/30"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Categories & Items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-32 space-y-5">
        {shortageCategories.map((category) => (
          <div key={category.title}>
            <h3 className="text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider">
              {category.title}
            </h3>
            <div className="space-y-1.5">
              {category.items.map((item) => {
                const selected = selectedItems.get(item.key);
                return (
                  <div
                    key={item.key}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors ${
                      selected
                        ? "border-warning bg-warning/10"
                        : "border-border bg-background hover:bg-muted/30"
                    }`}
                  >
                    <button
                      onClick={() => toggleItem(item)}
                      className="flex-1 text-right"
                    >
                      <span className={`text-sm font-medium ${selected ? "text-foreground" : "text-muted-foreground"}`}>
                        {selected ? "✓ " : ""}{item.label}
                      </span>
                    </button>
                    {selected && (
                      <div className="flex items-center gap-2 mr-3">
                        <button
                          onClick={() => updateQuantity(item.key, -1)}
                          className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm font-bold mono">{selected.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.key, 1)}
                          className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Fixed submit button */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-4 z-40">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-warning text-warning-foreground font-bold text-base flex items-center justify-center gap-3 hover:bg-warning/90 transition-colors disabled:opacity-50"
          >
            <Send size={20} />
            {submitting ? "שולח..." : `שלח דיווח (${totalItems} פריטים)`}
          </button>
        </div>
      )}
    </div>
  );
};

export default ShortageReportScreen;
