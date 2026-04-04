import { useState, useMemo, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  CalendarPlus,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sun,
  Moon,
  Send,
  Loader2,
  AlertTriangle,
  X,
  Package,
  Copy,
  Users,
  Clock,
  Building2,
  Layers,
  GripVertical,
  Info,
  Star,
  StarOff,
  UserX,
  UserPlus,
} from "lucide-react";
import {
  useStaffProfiles,
  useTodayAssignments,
  useCreateAssignment,
} from "@/hooks/usePropertyManagerData";
import { supabase } from "@/integrations/supabase/client";
import { useWorkPackages, WorkPackageWithTasks } from "@/hooks/useWorkPackages";
import { useStaffDefaultPackages, useSetStaffDefaults } from "@/hooks/useStaffDefaultPackages";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SHIFT_CAPACITY = 420; // 7h net

interface WorkerAssignments {
  [staffId: string]: string[]; // wpIds
}

type StaffAvailability = "morning" | "evening" | "absent";

const ShiftPlanningTab = ({ planDate: externalDate }: { planDate?: string }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (externalDate) return new Date(externalDate);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });

  const planDateStr = useMemo(() => selectedDate.toISOString().split("T")[0], [selectedDate]);
  const planDay = selectedDate.getDay();

  // Min date = tomorrow
  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const { data: staff = [], isLoading: staffLoading } = useStaffProfiles();
  const { data: workPackages = [] } = useWorkPackages();
  const { data: existingAssignments = [] } = useTodayAssignments(planDateStr);
  const { data: defaultPackages = [] } = useStaffDefaultPackages();
  const setStaffDefaults = useSetStaffDefaults();
  const createAssignment = useCreateAssignment();

  const [shift, setShift] = useState<"morning" | "evening">("morning");
  const [assignments, setAssignments] = useState<WorkerAssignments>({});
  const [staffAvailability, setStaffAvailability] = useState<Record<string, StaffAvailability>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [defaultsInitialized, setDefaultsInitialized] = useState<string | null>(null);
  const [editingDefaultsFor, setEditingDefaultsFor] = useState<string | null>(null);
  const [overloadModal, setOverloadModal] = useState<{
    staffId: string;
    staffName: string;
    wpId: string;
    wpName: string;
    overMinutes: number;
  } | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourceDate, setCopySourceDate] = useState<Date | undefined>(undefined);
  const [copying, setCopying] = useState(false);

  // Available staff (not absent)
  const availableStaff = useMemo(
    () => staff.filter((s) => staffAvailability[s.id] !== "absent"),
    [staff, staffAvailability]
  );

  const absentStaff = useMemo(
    () => staff.filter((s) => staffAvailability[s.id] === "absent"),
    [staff, staffAvailability]
  );

  // Relevant WPs for tomorrow + selected shift
  const shiftWps = useMemo(
    () =>
      workPackages.filter((wp) => {
        if (wp.shift_type !== shift) return false;
        if (wp.is_recurring) return wp.days_of_week.includes(planDay);
        return true;
      }),
    [workPackages, shift, planDay]
  );

  // Pre-fill defaults when shift changes or defaults load
  useEffect(() => {
    const key = `${shift}-${defaultPackages.length}`;
    if (defaultsInitialized === key) return;
    if (!defaultPackages.length || !shiftWps.length) return;

    const initial: WorkerAssignments = {};
    for (const s of staff) {
      const staffDefaults = defaultPackages
        .filter((d) => d.staff_user_id === s.id)
        .map((d) => d.work_package_id)
        .filter((wpId) => shiftWps.some((wp) => wp.id === wpId));
      
      // Don't add if already saved
      const savedWpIds = existingAssignments
        .filter((a) => a.staff_user_id === s.id && a.shift_type === shift && a.work_package_id)
        .map((a) => a.work_package_id!);
      
      const newDefaults = staffDefaults.filter((id) => !savedWpIds.includes(id));
      if (newDefaults.length > 0) {
        initial[s.id] = newDefaults;
      }
    }
    setAssignments(initial);
    setDefaultsInitialized(key);
  }, [shift, defaultPackages, shiftWps, staff, existingAssignments, defaultsInitialized]);

  // Already saved assignments for this shift
  const savedForShift = useMemo(
    () => existingAssignments.filter((a) => a.shift_type === shift),
    [existingAssignments, shift]
  );

  const savedWpIds = useMemo(
    () => new Set(savedForShift.map((a) => a.work_package_id).filter(Boolean)),
    [savedForShift]
  );

  // All assigned WP IDs (saved + draft)
  const allAssignedWpIds = useMemo(() => {
    const ids = new Set(savedWpIds);
    for (const wpIds of Object.values(assignments)) {
      for (const id of wpIds) ids.add(id);
    }
    return ids;
  }, [assignments, savedWpIds]);

  // Unassigned WPs
  const unassignedWps = useMemo(
    () => shiftWps.filter((wp) => !allAssignedWpIds.has(wp.id)),
    [shiftWps, allAssignedWpIds]
  );

  // Helper: get WP total minutes
  const wpMinutes = useCallback(
    (wpId: string) => {
      const wp = workPackages.find((w) => w.id === wpId);
      if (!wp) return 0;
      return wp.tasks.reduce((s, t) => s + (Number(t.standard_minutes) || 0), 0);
    },
    [workPackages]
  );

  // Worker capacity
  const getWorkerLoad = useCallback(
    (staffId: string) => {
      const wpIds = assignments[staffId] || [];
      const draftMins = wpIds.reduce((s, id) => s + wpMinutes(id), 0);
      const savedMins = savedForShift
        .filter((a) => a.staff_user_id === staffId && a.work_package_id)
        .reduce((s, a) => s + wpMinutes(a.work_package_id!), 0);
      const total = draftMins + savedMins;
      const pct = Math.round((total / SHIFT_CAPACITY) * 100);
      return {
        totalMinutes: total,
        draftMinutes: draftMins,
        savedMinutes: savedMins,
        pct,
        status: pct <= 60 ? "under" : pct <= 100 ? "balanced" : "over",
        taskCount:
          wpIds.reduce((s, id) => {
            const wp = workPackages.find((w) => w.id === id);
            return s + (wp?.tasks.length || 0);
          }, 0) +
          savedForShift
            .filter((a) => a.staff_user_id === staffId && a.work_package_id)
            .reduce((s, a) => {
              const wp = workPackages.find((w) => w.id === a.work_package_id!);
              return s + (wp?.tasks.length || 0);
            }, 0),
      };
    },
    [assignments, savedForShift, wpMinutes, workPackages]
  );

  // Assign a WP to a worker (with overload check)
  const assignWp = useCallback(
    (staffId: string, wpId: string, force = false) => {
      const currentLoad = getWorkerLoad(staffId);
      const addMins = wpMinutes(wpId);
      const newTotal = currentLoad.totalMinutes + addMins;

      if (!force && newTotal > SHIFT_CAPACITY) {
        const s = staff.find((st) => st.id === staffId);
        const wp = workPackages.find((w) => w.id === wpId);
        setOverloadModal({
          staffId,
          staffName: s?.full_name || "",
          wpId,
          wpName: wp?.name || wp?.package_code || "",
          overMinutes: newTotal - SHIFT_CAPACITY,
        });
        return;
      }

      setAssignments((prev) => ({
        ...prev,
        [staffId]: [...(prev[staffId] || []), wpId],
      }));
    },
    [getWorkerLoad, wpMinutes, staff, workPackages]
  );

  const unassignWp = useCallback((staffId: string, wpId: string) => {
    setAssignments((prev) => ({
      ...prev,
      [staffId]: (prev[staffId] || []).filter((id) => id !== wpId),
    }));
  }, []);

  // Drag handler
  const onDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;

      const srcDroppable = source.droppableId;
      const dstDroppable = destination.droppableId;

      if (srcDroppable === dstDroppable) return;

      const wpId = draggableId;

      if (srcDroppable === "unassigned" && dstDroppable.startsWith("worker-")) {
        const staffId = dstDroppable.replace("worker-", "");
        assignWp(staffId, wpId);
        return;
      }

      if (srcDroppable.startsWith("worker-") && dstDroppable === "unassigned") {
        const staffId = srcDroppable.replace("worker-", "");
        unassignWp(staffId, wpId);
        return;
      }

      if (srcDroppable.startsWith("worker-") && dstDroppable.startsWith("worker-")) {
        const fromStaff = srcDroppable.replace("worker-", "");
        const toStaff = dstDroppable.replace("worker-", "");
        unassignWp(fromStaff, wpId);
        assignWp(toStaff, wpId);
      }
    },
    [assignWp, unassignWp]
  );

  // Validation for send button
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (unassignedWps.length > 0) {
      errors.push(`${unassignedWps.length} חבילות לא שובצו`);
    }
    const overloadedWorkers = availableStaff.filter((s) => {
      const load = getWorkerLoad(s.id);
      return load.totalMinutes > 0 && load.status === "over";
    });
    if (overloadedWorkers.length > 0) {
      const names = overloadedWorkers.map((w) => w.full_name).join(", ");
      errors.push(`עומס יתר: ${names}`);
    }
    const totalDraftAssignments = Object.values(assignments).reduce(
      (s, ids) => s + ids.length,
      0
    );
    if (totalDraftAssignments === 0) {
      errors.push("לא בוצעו שיבוצים חדשים");
    }
    return errors;
  }, [unassignedWps, availableStaff, getWorkerLoad, assignments]);

  const hasDrafts = Object.values(assignments).some((ids) => ids.length > 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises: Promise<any>[] = [];
      for (const [staffId, wpIds] of Object.entries(assignments)) {
        if (staffAvailability[staffId] === "absent") continue;
        for (const wpId of wpIds) {
          promises.push(
            createAssignment.mutateAsync({
              staffId,
              workPackageId: wpId,
              shiftType: shift,
              date: planDateStr,
            })
          );
        }
      }
      await Promise.all(promises);
      setSaved(true);
      setAssignments({});
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  };

  // Copy assignments from another date
  const handleCopyFromDate = async () => {
    if (!copySourceDate) return;
    setCopying(true);
    try {
      const sourceStr = copySourceDate.toISOString().split("T")[0];
      const { data: sourceAssignments } = await supabase
        .from("assignments")
        .select("staff_user_id, work_package_id, shift_type")
        .eq("date", sourceStr)
        .not("work_package_id", "is", null);

      if (!sourceAssignments || sourceAssignments.length === 0) {
        setCopying(false);
        setCopyDialogOpen(false);
        return;
      }

      const promises: Promise<any>[] = [];
      for (const a of sourceAssignments) {
        // Skip if already exists for target date
        const alreadyExists = existingAssignments.some(
          (ex) => ex.staff_user_id === a.staff_user_id && ex.work_package_id === a.work_package_id && ex.shift_type === a.shift_type
        );
        if (alreadyExists) continue;

        promises.push(
          createAssignment.mutateAsync({
            staffId: a.staff_user_id,
            workPackageId: a.work_package_id!,
            shiftType: a.shift_type as "morning" | "evening",
            date: planDateStr,
          })
        );
      }
      await Promise.all(promises);
      setSaved(true);
      setAssignments({});
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // handled
    } finally {
      setCopying(false);
      setCopyDialogOpen(false);
      setCopySourceDate(undefined);
    }
  };


  const handleSaveAsDefaults = (staffId: string) => {
    const draftWpIds = assignments[staffId] || [];
    const savedWpIdsForWorker = savedForShift
      .filter((a) => a.staff_user_id === staffId && a.work_package_id)
      .map((a) => a.work_package_id!);
    const allWpIds = [...new Set([...draftWpIds, ...savedWpIdsForWorker])];
    setStaffDefaults.mutate({ staffId, workPackageIds: allWpIds });
  };

  const getStaffDefaultWpIds = (staffId: string) =>
    defaultPackages.filter((d) => d.staff_user_id === staffId).map((d) => d.work_package_id);

  const dateFormatted = selectedDate.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalWps = shiftWps.length;
    const assignedCount = allAssignedWpIds.size;
    const unassignedCount = unassignedWps.length;
    const overloadedWorkers = availableStaff.filter((s) => {
      const load = getWorkerLoad(s.id);
      return load.totalMinutes > 0 && load.status === "over";
    }).length;
    const totalPlannedMins = availableStaff.reduce((s, st) => s + getWorkerLoad(st.id).totalMinutes, 0);
    return { totalWps, assignedCount, unassignedCount, overloadedWorkers, totalPlannedMins };
  }, [shiftWps, allAssignedWpIds, unassignedWps, availableStaff, getWorkerLoad]);

  if (staffLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4 animate-slide-up">
        {/* ─── Header ─── */}
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="font-bold text-base flex items-center gap-2">
              <CalendarPlus size={18} />
              תכנון עתידי
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const prev = new Date(selectedDate);
                  prev.setDate(prev.getDate() - 1);
                  if (prev >= minDate) {
                    setSelectedDate(prev);
                    setAssignments({});
                    setDefaultsInitialized(null);
                  }
                }}
                disabled={selectedDate <= minDate}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm font-semibold transition-colors border border-border">
                    <CalendarPlus size={14} />
                    {dateFormatted}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => {
                      if (d) {
                        setSelectedDate(d);
                        setAssignments({});
                        setDefaultsInitialized(null);
                      }
                    }}
                    disabled={(date) => date < minDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <button
                onClick={() => {
                  const next = new Date(selectedDate);
                  next.setDate(next.getDate() + 1);
                  setSelectedDate(next);
                  setAssignments({});
                  setDefaultsInitialized(null);
                }}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setCopyDialogOpen(true)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors mr-1"
                  >
                    <Copy size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>העתק שיבוץ מיום אחר</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Shift Toggle + Absent */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => { setShift("morning"); setAssignments({}); setDefaultsInitialized(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                shift === "morning"
                  ? "bg-warning/15 border-warning text-warning"
                  : "bg-muted border-transparent text-muted-foreground hover:border-warning/30"
              }`}
            >
              <Sun size={16} /> בוקר
            </button>
            <button
              onClick={() => { setShift("evening"); setAssignments({}); setDefaultsInitialized(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                shift === "evening"
                  ? "bg-info/15 border-info text-info"
                  : "bg-muted border-transparent text-muted-foreground hover:border-info/30"
              }`}
            >
              <Moon size={16} /> ערב
            </button>
          </div>

          {/* Summary Bar */}
          <div className="grid grid-cols-5 gap-2 text-center">
            <SummaryCell label="חבילות" value={summaryStats.totalWps} />
            <SummaryCell label="שובצו" value={summaryStats.assignedCount} variant="success" />
            <SummaryCell
              label="נותרו"
              value={summaryStats.unassignedCount}
              variant={summaryStats.unassignedCount > 0 ? "warning" : "success"}
            />
            <SummaryCell
              label="חריגות"
              value={summaryStats.overloadedWorkers}
              variant={summaryStats.overloadedWorkers > 0 ? "destructive" : "muted"}
            />
            <SummaryCell
              label="דק׳ מתוכננות"
              value={summaryStats.totalPlannedMins}
              mono
            />
          </div>
        </div>

        {/* ─── Empty states ─── */}
        {shiftWps.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package size={32} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm font-semibold">אין חבילות עבודה מוגדרות לתאריך ומשמרת זו</p>
            <p className="text-xs mt-1">הגדר חבילות עבודה בלשונית "חבילות עבודה"</p>
          </div>
        )}

        {staff.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users size={32} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm font-semibold">אין עובדים זמינים למשמרת</p>
          </div>
        )}

        {shiftWps.length > 0 && staff.length > 0 && (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* ─── LEFT: Unassigned Templates ─── */}
              <div className="lg:col-span-4">
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Package size={14} />
                      חבילות לשיבוץ
                    </h3>
                    <span className={`text-xs font-mono font-bold rounded-full px-2 py-0.5 ${
                      unassignedWps.length > 0
                        ? "bg-warning/15 text-warning"
                        : "bg-success/15 text-success"
                    }`}>
                      {unassignedWps.length}
                    </span>
                  </div>

                  <Droppable droppableId="unassigned">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-3 space-y-2 min-h-[120px] transition-colors ${
                          snapshot.isDraggingOver ? "bg-primary/5" : ""
                        }`}
                      >
                        {unassignedWps.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground text-xs">
                            <CheckCircle2 size={20} className="mx-auto mb-2 text-success" />
                            כל החבילות שובצו!
                          </div>
                        ) : (
                          unassignedWps.map((wp, index) => (
                            <WpCard
                              key={wp.id}
                              wp={wp}
                              index={index}
                              totalMinutes={wpMinutes(wp.id)}
                            />
                          ))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>

                {/* Instruction hint */}
                {unassignedWps.length > 0 && Object.values(assignments).every((ids) => ids.length === 0) && (
                  <div className="flex items-start gap-2 mt-3 p-3 rounded-xl bg-info/10 border border-info/20 text-info text-xs">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    <span>גרור חבילות עבודה אל שורות העובדים כדי לבנות את לוח המשמרת</span>
                  </div>
                )}
              </div>

              {/* ─── CENTER: Workers ─── */}
              <div className="lg:col-span-8 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Users size={14} className="text-muted-foreground" />
                  <h3 className="text-sm font-bold">עובדים</h3>
                  {absentStaff.length > 0 && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {absentStaff.length} לא מגיעים
                    </span>
                  )}
                </div>

                {availableStaff.map((s) => {
                  const load = getWorkerLoad(s.id);
                  const draftWpIds = assignments[s.id] || [];
                  const savedWpIdsForWorker = savedForShift
                    .filter((a) => a.staff_user_id === s.id && a.work_package_id)
                    .map((a) => a.work_package_id!);
                  const hasAny = load.totalMinutes > 0;
                  const staffDefaultWpIds = getStaffDefaultWpIds(s.id);

                  return (
                    <Droppable key={s.id} droppableId={`worker-${s.id}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`bg-card border rounded-xl p-4 transition-all ${
                            snapshot.isDraggingOver
                              ? "border-primary shadow-md ring-2 ring-primary/20"
                              : hasAny
                              ? "border-border"
                              : "border-dashed border-border/60"
                          }`}
                        >
                          {/* Worker header */}
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                              {s.avatar_initials || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm truncate">{s.full_name}</p>
                                {staffDefaultWpIds.length > 0 && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-warning/15 text-warning font-bold flex items-center gap-0.5">
                                    <Star size={8} /> ברירות מחדל
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-0.5">
                                  <Clock size={10} />
                                  {s.default_shift_start || "07:00"} – {s.default_shift_end || "15:00"}
                                </span>
                                <span className="mono">{SHIFT_CAPACITY} דק׳ קיבולת</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {/* Mark absent */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => {
                                      setStaffAvailability((prev) => ({ ...prev, [s.id]: "absent" }));
                                      // Remove assignments for absent staff
                                      setAssignments((prev) => {
                                        const copy = { ...prev };
                                        delete copy[s.id];
                                        return copy;
                                      });
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                  >
                                    <UserX size={14} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p>סמן כלא מגיע</p></TooltipContent>
                              </Tooltip>
                              {/* Save as defaults */}
                              {hasAny && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => handleSaveAsDefaults(s.id)}
                                      className="p-1.5 rounded-lg hover:bg-warning/10 text-muted-foreground hover:text-warning transition-colors"
                                    >
                                      <Star size={14} />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top"><p>שמור כברירת מחדל</p></TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            {hasAny && (
                              <div className="text-left shrink-0">
                                <p className={`text-sm font-bold mono ${
                                  load.status === "over"
                                    ? "text-destructive"
                                    : load.status === "balanced"
                                    ? "text-success"
                                    : "text-warning"
                                }`}>
                                  {load.totalMinutes}/{SHIFT_CAPACITY}
                                </p>
                                <p className="text-[10px] text-muted-foreground">{load.taskCount} משימות</p>
                              </div>
                            )}
                          </div>

                          {/* Capacity bar */}
                          {hasAny && (
                            <div className="mb-3">
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    load.status === "over"
                                      ? "bg-destructive"
                                      : load.status === "balanced"
                                      ? "bg-success"
                                      : "bg-warning"
                                  }`}
                                  style={{ width: `${Math.min(load.pct, 100)}%` }}
                                />
                              </div>
                              {load.status === "over" && (
                                <div className="flex items-center gap-1 text-[10px] text-destructive mt-1 font-semibold">
                                  <AlertTriangle size={10} />
                                  חריגה של {load.totalMinutes - SHIFT_CAPACITY} דק׳
                                </div>
                              )}
                            </div>
                          )}

                          {/* Saved assignments */}
                          {savedWpIdsForWorker.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {savedWpIdsForWorker.map((wpId) => {
                                const wp = workPackages.find((w) => w.id === wpId);
                                return (
                                  <span
                                    key={wpId}
                                    className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg bg-success/10 text-success font-semibold border border-success/20"
                                  >
                                    <CheckCircle2 size={10} />
                                    {wp?.name || wp?.package_code || "—"}
                                    <span className="mono opacity-70">{wpMinutes(wpId)}′</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* Draft assignments (draggable) */}
                          {draftWpIds.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-1">
                              {draftWpIds.map((wpId, idx) => {
                                const wp = workPackages.find((w) => w.id === wpId);
                                const isDefault = staffDefaultWpIds.includes(wpId);
                                return (
                                  <Draggable key={wpId} draggableId={wpId} index={idx}>
                                    {(dragProvided) => (
                                      <span
                                        ref={dragProvided.innerRef}
                                        {...dragProvided.draggableProps}
                                        {...dragProvided.dragHandleProps}
                                        className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg font-semibold border cursor-grab active:cursor-grabbing ${
                                          isDefault
                                            ? "bg-warning/10 text-warning border-warning/20"
                                            : "bg-primary/10 text-primary border-primary/20"
                                        }`}
                                      >
                                        <GripVertical size={10} className="opacity-50" />
                                        {isDefault && <Star size={8} className="opacity-60" />}
                                        {wp?.name || wp?.package_code || "—"}
                                        <span className="mono opacity-70">{wpMinutes(wpId)}′</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            unassignWp(s.id, wpId);
                                          }}
                                          className="mr-0.5 p-0.5 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive"
                                        >
                                          <X size={10} />
                                        </button>
                                      </span>
                                    )}
                                  </Draggable>
                                );
                              })}
                            </div>
                          )}

                          {/* Empty drop zone indicator */}
                          {!hasAny && !snapshot.isDraggingOver && (
                            <p className="text-[10px] text-muted-foreground/60 text-center py-2">
                              גרור חבילות לכאן
                            </p>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  );
                })}

                {/* Absent workers section */}
                {absentStaff.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <UserX size={12} />
                      לא מגיעים
                    </h4>
                    <div className="space-y-1.5">
                      {absentStaff.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between bg-muted/50 border border-dashed border-border/50 rounded-xl px-4 py-2.5 opacity-60"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">
                              {s.avatar_initials || "?"}
                            </div>
                            <p className="text-sm line-through text-muted-foreground">{s.full_name}</p>
                          </div>
                          <button
                            onClick={() => setStaffAvailability((prev) => {
                              const copy = { ...prev };
                              delete copy[s.id];
                              return copy;
                            })}
                            className="text-[10px] text-primary font-semibold hover:underline"
                          >
                            החזר
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DragDropContext>
        )}

        {/* ─── Send Button ─── */}
        {shiftWps.length > 0 && staff.length > 0 && (
          <>
            {saved ? (
              <div className="flex items-center justify-center gap-2 py-4 text-success font-semibold">
                <CheckCircle2 size={20} /> שיבוצים נשלחו בהצלחה!
              </div>
            ) : (
              <div className="space-y-2">
                {validationErrors.length > 0 && hasDrafts && (
                  <div className="space-y-1.5">
                    {validationErrors.map((err, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs p-2.5 rounded-lg bg-warning/10 border border-warning/20 text-warning"
                      >
                        <AlertTriangle size={12} className="shrink-0" />
                        {err}
                      </div>
                    ))}
                  </div>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <button
                        onClick={handleSave}
                        disabled={!hasDrafts || saving}
                        className="btn-action-primary w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {saving ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Send size={18} />
                        )}
                        {saving
                          ? "שולח שיבוצים..."
                          : `שלח שיבוצים (${Object.values(assignments).reduce(
                              (s, ids) => s + ids.length,
                              0
                            )})`}
                      </button>
                    </div>
                  </TooltipTrigger>
                  {!hasDrafts && (
                    <TooltipContent side="top">
                      <p>גרור חבילות עבודה אל העובדים כדי ליצור שיבוצים</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            )}
          </>
        )}

        {/* ─── Overload Confirmation Modal ─── */}
        <Dialog
          open={!!overloadModal}
          onOpenChange={(open) => !open && setOverloadModal(null)}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle size={18} />
                חריגת קיבולת
              </DialogTitle>
              <DialogDescription className="text-right">
                שיבוץ <strong>{overloadModal?.wpName}</strong> ל-
                <strong>{overloadModal?.staffName}</strong> חורג מהקיבולת ב-
                <strong className="text-destructive"> {overloadModal?.overMinutes} דקות</strong>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => setOverloadModal(null)}
              >
                ביטול
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (overloadModal) {
                    setAssignments((prev) => ({
                      ...prev,
                      [overloadModal.staffId]: [
                        ...(prev[overloadModal.staffId] || []),
                        overloadModal.wpId,
                      ],
                    }));
                    setOverloadModal(null);
                  }
                }}
              >
                שבץ בכל זאת
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Copy from Date Dialog ─── */}
        <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>העתקת שיבוץ מיום אחר</DialogTitle>
              <DialogDescription>
                בחר תאריך מקור להעתקת כל השיבוצים אל {dateFormatted}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-2">
              <Calendar
                mode="single"
                selected={copySourceDate}
                onSelect={setCopySourceDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setCopyDialogOpen(false); setCopySourceDate(undefined); }}>
                ביטול
              </Button>
              <Button
                onClick={handleCopyFromDate}
                disabled={!copySourceDate || copying}
              >
                {copying ? <Loader2 size={16} className="animate-spin ml-2" /> : <Copy size={16} className="ml-2" />}
                העתק שיבוצים
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

/* ─── Sub-components ─── */

function SummaryCell({
  label,
  value,
  variant,
  mono,
}: {
  label: string;
  value: number;
  variant?: "success" | "warning" | "destructive" | "muted";
  mono?: boolean;
}) {
  const colorMap = {
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
    muted: "text-muted-foreground",
  };
  const bgMap = {
    success: "bg-success/10",
    warning: "bg-warning/10",
    destructive: "bg-destructive/10",
    muted: "bg-muted/50",
  };
  return (
    <div className={`rounded-lg p-2 ${variant ? bgMap[variant] : "bg-muted/50"}`}>
      <p className={`text-lg font-bold ${mono ? "mono" : ""} ${variant ? colorMap[variant] : ""}`}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function WpCard({
  wp,
  index,
  totalMinutes,
}: {
  wp: WorkPackageWithTasks;
  index: number;
  totalMinutes: number;
}) {
  const isHeavy = totalMinutes > 120;

  return (
    <Draggable draggableId={wp.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-card border rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all ${
            snapshot.isDragging
              ? "shadow-lg ring-2 ring-primary/30 rotate-1 scale-105"
              : "border-border hover:border-primary/30 hover:shadow-sm"
          } ${isHeavy ? "border-l-4 border-l-warning" : ""}`}
        >
          <div className="flex items-start gap-2">
            <GripVertical size={14} className="text-muted-foreground/40 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs truncate">{wp.name || wp.package_code}</p>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-0.5 mono font-semibold">
                  <Clock size={10} /> {totalMinutes}′
                </span>
                <span className="flex items-center gap-0.5">
                  <Layers size={10} /> {wp.tasks.length} משימות
                </span>
                {wp.building && (
                  <span className="flex items-center gap-0.5">
                    <Building2 size={10} /> {wp.building}
                    {wp.floor ? `/${wp.floor}` : ""}
                  </span>
                )}
              </div>
            </div>
            {isHeavy && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-warning/15 text-warning font-bold shrink-0">
                כבד
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default ShiftPlanningTab;
