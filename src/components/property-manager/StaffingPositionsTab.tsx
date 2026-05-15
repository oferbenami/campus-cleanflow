import { useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Briefcase,
  Sun,
  Moon,
  Plus,
  Trash2,
  UserPlus,
  UserMinus,
  CalendarIcon,
  ChevronDown,
  ChevronUp,
  Loader2,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkPackages } from "@/hooks/useWorkPackages";
import {
  useStaffingPositions,
  useCreateStaffingPosition,
  useDeleteStaffingPosition,
  useSetPositionPackages,
  usePositionAssignments,
  useUnassignWorkerFromPosition,
  useSpecialCalendarDays,
  useAddSpecialDay,
  useDeleteSpecialDay,
  type StaffingPositionWithPackages,
} from "@/hooks/useStaffingPositions";
import PositionWorkerAssignDialog from "./PositionWorkerAssignDialog";

// ─── Position Card ────────────────────────────────────────────────────────────

function PositionCard({
  position,
  packageNames,
  assignedWorker,
  onDelete,
  onAssign,
  onUnassign,
  assignmentId,
}: {
  position: StaffingPositionWithPackages;
  packageNames: string[];
  assignedWorker: string | null;
  onDelete: () => void;
  onAssign: () => void;
  onUnassign: () => void;
  assignmentId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: workPackages = [] } = useWorkPackages();
  const setPackages = useSetPositionPackages();
  const [editing, setEditing] = useState(false);
  const [selectedPkgIds, setSelectedPkgIds] = useState<string[]>(position.package_ids);

  const shiftPackages = workPackages.filter((wp) => wp.shift_type === position.shift_type);

  const handleSavePackages = async () => {
    await setPackages.mutateAsync({ positionId: position.id, workPackageIds: selectedPkgIds });
    setEditing(false);
  };

  return (
    <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          {position.shift_type === "morning" ? (
            <Sun size={15} className="text-amber-500 shrink-0" />
          ) : (
            <Moon size={15} className="text-blue-400 shrink-0" />
          )}
          <span className="font-medium text-sm truncate">{position.name}</span>
          <Badge variant="outline" className="text-xs shrink-0">
            {position.package_ids.length} חבילות
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-destructive/10 text-destructive"
            title="הסר תקן"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Worker chip */}
      <div className="px-4 pb-3 flex items-center gap-2">
        {assignedWorker ? (
          <>
            <span className="text-xs text-muted-foreground">עובד קבוע:</span>
            <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {assignedWorker}
            </span>
            <button
              onClick={onUnassign}
              className="p-0.5 rounded hover:bg-destructive/10 text-destructive ml-auto"
              title="הסר שיבוץ"
            >
              <UserMinus size={13} />
            </button>
          </>
        ) : (
          <button
            onClick={onAssign}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <UserPlus size={13} /> שבץ עובד
          </button>
        )}
      </div>

      {/* Expanded: packages editor */}
      {expanded && (
        <div className="border-t px-4 py-3 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Package size={12} /> חבילות עבודה
            </span>
            {!editing ? (
              <button
                onClick={() => { setEditing(true); setSelectedPkgIds(position.package_ids); }}
                className="text-xs text-primary hover:underline"
              >
                ערוך
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:underline">
                  ביטול
                </button>
                <button
                  onClick={handleSavePackages}
                  disabled={setPackages.isPending}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {setPackages.isPending ? <Loader2 size={10} className="animate-spin inline" /> : "שמור"}
                </button>
              </div>
            )}
          </div>

          {!editing ? (
            <div className="flex flex-wrap gap-1">
              {packageNames.length > 0 ? (
                packageNames.map((name, i) => (
                  <span key={i} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                    {name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">אין חבילות</span>
              )}
            </div>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {shiftPackages.map((wp) => (
                <label key={wp.id} className="flex items-center gap-2 cursor-pointer select-none text-xs">
                  <input
                    type="checkbox"
                    checked={selectedPkgIds.includes(wp.id)}
                    onChange={() =>
                      setSelectedPkgIds((prev) =>
                        prev.includes(wp.id) ? prev.filter((id) => id !== wp.id) : [...prev, wp.id]
                      )
                    }
                    className="rounded"
                  />
                  <span>{wp.name} ({wp.package_code})</span>
                </label>
              ))}
              {shiftPackages.length === 0 && (
                <span className="text-xs text-muted-foreground">אין חבילות עבור משמרת זו</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Calendar Section ─────────────────────────────────────────────────────────

function CalendarSection() {
  const { data: specialDays = [], isLoading } = useSpecialCalendarDays();
  const addDay = useAddSpecialDay();
  const deleteDay = useDeleteSpecialDay();

  const [newDate, setNewDate] = useState<Date | undefined>();
  const [newType, setNewType] = useState<"holiday_eve" | "holiday">("holiday_eve");
  const [newDesc, setNewDesc] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = async () => {
    if (!newDate) return;
    await addDay.mutateAsync({
      date: newDate.toISOString().split("T")[0],
      day_type: newType,
      description: newDesc || undefined,
    });
    setNewDate(undefined);
    setNewDesc("");
    setShowAdd(false);
  };

  const upcoming = specialDays.filter((d) => d.date >= new Date().toISOString().split("T")[0]);

  return (
    <div className="border rounded-xl bg-card shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <CalendarIcon size={14} /> ימים מיוחדים (ערבי חג / חגים)
        </h3>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Plus size={13} /> הוסף
        </button>
      </div>

      {showAdd && (
        <div className="mb-3 p-3 border rounded-lg bg-muted/30 space-y-2">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1">תאריך</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start text-right font-normal text-xs">
                    <CalendarIcon size={12} className="ml-1 opacity-50" />
                    {newDate ? format(newDate, "dd/MM/yyyy") : "בחר תאריך"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={newDate} onSelect={setNewDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1">סוג</label>
              <select
                className="w-full border rounded-md px-2 py-1.5 text-xs bg-background"
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
              >
                <option value="holiday_eve">ערב חג</option>
                <option value="holiday">חג / שבת</option>
              </select>
            </div>
          </div>
          <Input
            placeholder="שם החג (רשות)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="text-xs h-8"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>ביטול</Button>
            <Button size="sm" onClick={handleAdd} disabled={!newDate || addDay.isPending}>
              {addDay.isPending ? <Loader2 size={12} className="animate-spin ml-1" /> : null}
              הוסף
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
      ) : upcoming.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">אין ימים מיוחדים מוגדרים</p>
      ) : (
        <div className="space-y-1.5">
          {upcoming.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-xs">
              <span className="font-medium">{format(new Date(d.date), "dd/MM/yyyy")}</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs",
                d.day_type === "holiday_eve" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
              )}>
                {d.day_type === "holiday_eve" ? "ערב חג" : "חג"}
                {d.description ? ` — ${d.description}` : ""}
              </span>
              <button
                onClick={() => deleteDay.mutate(d.id)}
                className="p-0.5 rounded hover:bg-destructive/10 text-destructive"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export default function StaffingPositionsTab() {
  const { data: positions = [], isLoading } = useStaffingPositions();
  const { data: workPackages = [] } = useWorkPackages();
  const { data: positionAssignments = [] } = usePositionAssignments();
  const createPosition = useCreateStaffingPosition();
  const deletePosition = useDeleteStaffingPosition();
  const unassign = useUnassignWorkerFromPosition();

  const [shiftFilter, setShiftFilter] = useState<"morning" | "evening">("morning");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [assignDialogPosition, setAssignDialogPosition] = useState<StaffingPositionWithPackages | null>(null);

  const filtered = positions.filter((p) => p.shift_type === shiftFilter);

  const pkgNameMap = Object.fromEntries(workPackages.map((wp) => [wp.id, wp.name]));

  const workerForPosition = (posId: string) => {
    const a = positionAssignments.find((a) => a.staffing_position_id === posId);
    return a ? { name: a.staff_name || "—", id: a.id } : null;
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createPosition.mutateAsync({ name: newName.trim(), shift_type: shiftFilter });
    setNewName("");
    setShowCreateForm(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Briefcase size={20} /> תקנות — שיבוצים קבועים
        </h2>
        <Button size="sm" onClick={() => setShowCreateForm((v) => !v)}>
          <Plus size={14} className="ml-1" /> צור תקן
        </Button>
      </div>

      {/* Shift filter */}
      <div className="flex gap-2">
        {(["morning", "evening"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setShiftFilter(s)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
              shiftFilter === s
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted"
            )}
          >
            {s === "morning" ? <Sun size={14} /> : <Moon size={14} />}
            {s === "morning" ? "בוקר" : "ערב"}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="border rounded-xl p-4 bg-muted/20 flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">שם התקן</label>
            <Input
              placeholder={`לדוגמה: ניקיון שירותים — ${shiftFilter === "morning" ? "בוקר" : "ערב"}`}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="text-sm"
            />
          </div>
          <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || createPosition.isPending}>
            {createPosition.isPending ? <Loader2 size={14} className="animate-spin ml-1" /> : null}
            צור
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowCreateForm(false)}>ביטול</Button>
        </div>
      )}

      {/* Positions list */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          אין תקנות למשמרת {shiftFilter === "morning" ? "בוקר" : "ערב"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((position) => {
            const worker = workerForPosition(position.id);
            return (
              <PositionCard
                key={position.id}
                position={position}
                packageNames={position.package_ids.map((id) => pkgNameMap[id] || id)}
                assignedWorker={worker?.name ?? null}
                assignmentId={worker?.id ?? null}
                onDelete={() => deletePosition.mutate(position.id)}
                onAssign={() => setAssignDialogPosition(position)}
                onUnassign={() => worker && unassign.mutate(worker.id)}
              />
            );
          })}
        </div>
      )}

      {/* Calendar section */}
      <CalendarSection />

      {/* Assign worker dialog */}
      {assignDialogPosition && (
        <PositionWorkerAssignDialog
          position={assignDialogPosition}
          open={!!assignDialogPosition}
          onClose={() => setAssignDialogPosition(null)}
        />
      )}
    </div>
  );
}
