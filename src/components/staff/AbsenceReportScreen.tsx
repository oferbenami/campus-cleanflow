import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { X, CalendarDays, Send, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { he } from "date-fns/locale";

const SITE_ID = "37027ccd-c7d7-4d77-988d-6da914e347b4";

interface Props {
  onClose: () => void;
}

const reasons = [
  { key: "sick", label: "מחלה", emoji: "🤒" },
  { key: "vacation", label: "חופשה", emoji: "🏖️" },
  { key: "personal", label: "אישי", emoji: "👤" },
  { key: "other", label: "אחר", emoji: "📝" },
];

const AbsenceReportScreen = ({ onClose }: Props) => {
  const { user } = useAuth();
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [reason, setReason] = useState("sick");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Next 14 days (excluding today)
  const futureDays = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(new Date(), i + 1);
    return { date: d, dateStr: d.toISOString().split("T")[0] };
  });

  const toggleDate = (dateStr: string) => {
    setSelectedDates(prev =>
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

  const handleSubmit = async () => {
    if (!user?.id || selectedDates.length === 0) return;
    setSubmitting(true);
    try {
      const rows = selectedDates.map(d => ({
        staff_user_id: user.id,
        site_id: SITE_ID,
        absence_date: d,
        reason: `${reason}${note ? ": " + note : ""}`,
      }));
      const { error } = await supabase.from("planned_absences").insert(rows);
      if (error) throw error;
      toast({ title: "✓ דיווח היעדרות נשלח!", description: `${selectedDates.length} ימים דווחו למנהל` });
      onClose();
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-warning/90 text-warning-foreground px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">דיווח היעדרות צפויה</h1>
        <button onClick={onClose} className="p-1.5 rounded-lg bg-foreground/10 hover:bg-foreground/20">
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 p-4 space-y-5 overflow-auto">
        {/* Reason selection */}
        <div>
          <p className="text-sm font-bold text-foreground mb-2">סיבה</p>
          <div className="grid grid-cols-2 gap-2">
            {reasons.map(r => (
              <button
                key={r.key}
                onClick={() => setReason(r.key)}
                className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-colors ${
                  reason === r.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                <span>{r.emoji}</span>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date selection */}
        <div>
          <p className="text-sm font-bold text-foreground mb-2">
            בחר ימים ({selectedDates.length} נבחרו)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {futureDays.map(({ date, dateStr }) => {
              const selected = selectedDates.includes(dateStr);
              const dayName = format(date, "EEE", { locale: he });
              return (
                <button
                  key={dateStr}
                  onClick={() => toggleDate(dateStr)}
                  className={`flex flex-col items-center p-2.5 rounded-xl border text-center transition-all ${
                    selected
                      ? "border-warning bg-warning/15 text-warning ring-1 ring-warning/30"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="text-[10px] text-muted-foreground">{dayName}</span>
                  <span className="text-sm font-bold">{format(date, "dd/MM")}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Note */}
        <div>
          <p className="text-sm font-bold text-foreground mb-2">הערות (אופציונלי)</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="פרטים נוספים..."
            className="w-full p-3 rounded-xl border border-border bg-card text-foreground text-sm resize-none h-20"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="px-4 pb-6 pt-2">
        <button
          onClick={handleSubmit}
          disabled={selectedDates.length === 0 || submitting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-warning text-warning-foreground font-bold text-lg disabled:opacity-50 transition-colors hover:bg-warning/90"
        >
          {submitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          שלח דיווח ({selectedDates.length} ימים)
        </button>
      </div>
    </div>
  );
};

export default AbsenceReportScreen;
