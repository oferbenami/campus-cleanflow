import { useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStaffProfiles } from "@/hooks/usePropertyManagerData";
import {
  useAssignWorkerToPosition,
  type DayType,
  type StaffingPositionWithPackages,
} from "@/hooks/useStaffingPositions";

interface Props {
  position: StaffingPositionWithPackages;
  open: boolean;
  onClose: () => void;
}

const DAY_TYPE_LABELS: { value: DayType; label: string }[] = [
  { value: "regular", label: "ימי עבודה רגילים (א–ה)" },
  { value: "friday_eve", label: "שישי / ערב חג" },
  { value: "holiday", label: "שבת / חגים" },
];

export default function PositionWorkerAssignDialog({ position, open, onClose }: Props) {
  const { data: staffProfiles = [] } = useStaffProfiles();
  const assignMutation = useAssignWorkerToPosition();

  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [isPermanent, setIsPermanent] = useState(true);
  const [effectiveFrom, setEffectiveFrom] = useState<Date>(new Date());
  const [effectiveUntil, setEffectiveUntil] = useState<Date | undefined>();
  const [selectedDayTypes, setSelectedDayTypes] = useState<DayType[]>(["regular", "friday_eve"]);

  const toggleDayType = (dt: DayType) => {
    setSelectedDayTypes((prev) =>
      prev.includes(dt) ? prev.filter((d) => d !== dt) : [...prev, dt]
    );
  };

  const handleSubmit = async () => {
    if (!selectedStaffId || selectedDayTypes.length === 0) return;

    await assignMutation.mutateAsync({
      staffing_position_id: position.id,
      staff_user_id: selectedStaffId,
      is_permanent: isPermanent,
      effective_from: effectiveFrom.toISOString().split("T")[0],
      effective_until: isPermanent
        ? null
        : effectiveUntil?.toISOString().split("T")[0] ?? null,
      applicable_day_types: selectedDayTypes,
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">שיבוץ עובד לתקן: {position.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Staff selection */}
          <div>
            <label className="block text-sm font-medium mb-1">עובד</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
            >
              <option value="">בחר עובד...</option>
              {staffProfiles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Permanent / Temporary */}
          <div>
            <label className="block text-sm font-medium mb-2">סוג שיבוץ</label>
            <div className="flex gap-3">
              <button
                onClick={() => setIsPermanent(true)}
                className={cn(
                  "flex-1 py-2 rounded-md border text-sm font-medium transition-colors",
                  isPermanent
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted"
                )}
              >
                קבוע
              </button>
              <button
                onClick={() => setIsPermanent(false)}
                className={cn(
                  "flex-1 py-2 rounded-md border text-sm font-medium transition-colors",
                  !isPermanent
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted"
                )}
              >
                זמני
              </button>
            </div>
          </div>

          {/* Date range */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">מתאריך</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-right font-normal" size="sm">
                    <CalendarIcon size={14} className="ml-2 opacity-50" />
                    {format(effectiveFrom, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={effectiveFrom}
                    onSelect={(d) => d && setEffectiveFrom(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {!isPermanent && (
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">עד תאריך</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-right font-normal" size="sm">
                      <CalendarIcon size={14} className="ml-2 opacity-50" />
                      {effectiveUntil ? format(effectiveUntil, "dd/MM/yyyy") : "בחר..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={effectiveUntil}
                      onSelect={(d) => setEffectiveUntil(d)}
                      disabled={(d) => d < effectiveFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Day types */}
          <div>
            <label className="block text-sm font-medium mb-2">ימי פעילות</label>
            <div className="space-y-2">
              {DAY_TYPE_LABELS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedDayTypes.includes(value)}
                    onChange={() => toggleDayType(value)}
                    className="rounded"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row-reverse gap-2">
          <Button
            onClick={handleSubmit}
            disabled={!selectedStaffId || selectedDayTypes.length === 0 || assignMutation.isPending}
          >
            {assignMutation.isPending ? <Loader2 size={14} className="animate-spin ml-1" /> : null}
            שבץ עובד
          </Button>
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
