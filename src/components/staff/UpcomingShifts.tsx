import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CalendarDays, X, Loader2, AlertTriangle } from "lucide-react";
import { format, addDays } from "date-fns";
import { he } from "date-fns/locale";

interface ShiftRow {
  id: string;
  date: string;
  shift_type: string;
  status: string;
  work_package_id: string | null;
}

interface Props {
  onClose: () => void;
  onReportAbsence: () => void;
}

const UpcomingShifts = ({ onClose, onReportAbsence }: Props) => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetchShifts = async () => {
      const today = new Date().toISOString().split("T")[0];
      const nextWeek = addDays(new Date(), 7).toISOString().split("T")[0];
      const { data } = await supabase
        .from("assignments")
        .select("id, date, shift_type, status, work_package_id")
        .eq("staff_user_id", user.id)
        .gte("date", today)
        .lte("date", nextWeek)
        .order("date", { ascending: true });
      setShifts(data || []);
      setLoading(false);
    };
    fetchShifts();
  }, [user?.id]);

  // Generate next 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), i);
    const dateStr = d.toISOString().split("T")[0];
    const shift = shifts.find(s => s.date === dateStr);
    return { date: d, dateStr, shift };
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">שיבוץ משמרות</h1>
        <button onClick={onClose} className="p-1.5 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20">
          <X size={18} />
        </button>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : (
        <div className="flex-1 p-4 space-y-2">
          {days.map(({ date, dateStr, shift }) => {
            const isToday = dateStr === new Date().toISOString().split("T")[0];
            return (
              <div
                key={dateStr}
                className={`rounded-xl border p-4 flex items-center justify-between transition-colors ${
                  shift
                    ? "bg-primary/5 border-primary/20"
                    : "bg-muted/30 border-border"
                } ${isToday ? "ring-2 ring-primary/30" : ""}`}
              >
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {format(date, "EEEE", { locale: he })}
                    {isToday && <span className="text-primary mr-1">(היום)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{format(date, "dd/MM")}</p>
                </div>
                {shift ? (
                  <div className="text-left">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-primary/15 text-primary text-xs font-bold">
                      {shift.shift_type === "morning" ? "☀️ בוקר" : "🌙 ערב"}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            );
          })}

          <button
            onClick={onReportAbsence}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-warning/40 bg-warning/5 text-warning font-bold text-sm hover:bg-warning/10 transition-colors"
          >
            <AlertTriangle size={18} />
            דיווח היעדרות צפויה
          </button>
        </div>
      )}
    </div>
  );
};

export default UpcomingShifts;
