import { useState } from "react";
import { Repeat, CalendarOff, Sun, Moon, Save, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { WorkPackageWithTasks } from "@/hooks/useWorkPackages";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const DAY_LABELS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

interface Props {
  pkg: WorkPackageWithTasks;
}

const WorkPackageSettingsPanel = ({ pkg }: Props) => {
  const qc = useQueryClient();
  const [isRecurring, setIsRecurring] = useState(pkg.is_recurring);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(pkg.days_of_week);
  const [shiftType, setShiftType] = useState(pkg.shift_type);
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const hasChanges =
    isRecurring !== pkg.is_recurring ||
    JSON.stringify(daysOfWeek) !== JSON.stringify(pkg.days_of_week) ||
    shiftType !== pkg.shift_type;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("work_packages")
        .update({
          is_recurring: isRecurring,
          days_of_week: daysOfWeek,
          shift_type: shiftType,
        } as any)
        .eq("id", pkg.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["work-packages"] });
      toast({ title: "הגדרות עודכנו" });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-muted/50 rounded-lg p-3 space-y-3">
      <h4 className="text-xs font-bold text-muted-foreground">הגדרות חבילה</h4>

      {/* Recurring toggle */}
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-xs">
          {isRecurring ? <Repeat size={12} className="text-primary" /> : <CalendarOff size={12} />}
          {isRecurring ? "מחזורי" : "חד-פעמי"}
        </Label>
        <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
      </div>

      {/* Shift type */}
      <div>
        <Label className="text-[10px] text-muted-foreground mb-1 block">משמרת</Label>
        <div className="flex gap-1">
          <button
            onClick={() => setShiftType("morning")}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              shiftType === "morning" ? "bg-warning/15 text-warning border border-warning" : "bg-background border border-input text-muted-foreground"
            }`}
          >
            <Sun size={12} /> בוקר
          </button>
          <button
            onClick={() => setShiftType("evening")}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              shiftType === "evening" ? "bg-info/15 text-info border border-info" : "bg-background border border-input text-muted-foreground"
            }`}
          >
            <Moon size={12} /> ערב
          </button>
        </div>
      </div>

      {/* Days of week (only if recurring) */}
      {isRecurring && (
        <div>
          <Label className="text-[10px] text-muted-foreground mb-1 block">ימי פעילות</Label>
          <div className="flex gap-1">
            {DAY_LABELS.map((label, idx) => (
              <button
                key={idx}
                onClick={() => toggleDay(idx)}
                className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-colors ${
                  daysOfWeek.includes(idx)
                    ? "bg-primary text-primary-foreground"
                    : "bg-background border border-input text-muted-foreground hover:border-primary/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save */}
      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          {saving ? "שומר..." : "שמור שינויים"}
        </button>
      )}
    </div>
  );
};

export default WorkPackageSettingsPanel;
