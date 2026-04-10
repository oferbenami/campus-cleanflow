import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SITE_ID } from "@/hooks/usePropertyManagerData";
import { toast } from "sonner";
import { useComputeShiftScore } from "@/hooks/useShiftScores";
import {
  ClipboardCheck, AlertTriangle, CheckCircle2, XCircle, MinusCircle,
  Send, Users, Trash2, Building2, MapPin, Plus, X, ChevronDown, ChevronUp,
  FileText, Sparkles,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

/* ─── Types ─── */

type ItemStatus = "ok" | "partial" | "not_ok" | "na";

interface ChecklistItem {
  id: string;
  label: string;
  status: ItemStatus;
  gap_description: string;
}

interface CleaningAction {
  id: string;
  label: string;
  status: ItemStatus;
  gap_description: string;
  affected_areas: string[];
}

interface SpecialArea {
  id: string;
  label: string;
  status: ItemStatus;
  gap_description: string;
  issue_reported: boolean;
}

interface WorkforceRow {
  id: string;
  worker_name: string;
  start_time: string;
  end_time: string;
  actual_hours: number;
  notes: string;
}

/* ─── Static definitions ─── */

const CHECKLIST_ITEMS: { id: string; label: string }[] = [
  { id: "floors_mopped", label: "רצפות נשטפו ונוקו" },
  { id: "surfaces_wiped", label: "משטחים נוקו" },
  { id: "restrooms_cleaned", label: "שירותים נוקו וחומרים הושלמו" },
  { id: "kitchenettes_cleaned", label: "מטבחונים נוקו" },
  { id: "equipment_stored", label: "ציוד הוחזר למחסן" },
  { id: "supplies_stocked", label: "מלאי חומרים הושלם" },
];

const CLEANING_ACTIONS: { id: string; label: string }[] = [
  { id: "carpet_vacuuming", label: "שאיבת שטיחים הושלמה" },
  { id: "trash_bins_emptied", label: "פחי אשפה רוקנו בכל האזורים" },
];

const SPECIAL_AREAS: { id: string; label: string }[] = [
  { id: "ceo_office", label: "משרד מנכ״ל" },
  { id: "trading_room", label: "חדר מסחר" },
  { id: "entrance_building", label: "כניסת בניין" },
  { id: "meeting_erez", label: "חדרי ישיבות (ארז)" },
  { id: "meeting_shelters", label: "חדרי ישיבות (מקלטים)" },
  { id: "floor_lobby", label: "לובי קומה" },
  { id: "main_lobby", label: "לובי ראשי" },
  { id: "elevators", label: "מעליות" },
  { id: "glass_elevators", label: "מעליות זכוכית" },
  { id: "outdoor_plaza", label: "רחבת חוץ" },
];

const STATUS_OPTIONS: { value: ItemStatus; label: string; icon: typeof CheckCircle2; color: string }[] = [
  { value: "ok", label: "תקין", icon: CheckCircle2, color: "text-success" },
  { value: "partial", label: "חלקי", icon: AlertTriangle, color: "text-warning" },
  { value: "not_ok", label: "לא תקין", icon: XCircle, color: "text-destructive" },
  { value: "na", label: "לא רלוונטי", icon: MinusCircle, color: "text-muted-foreground" },
];

const CRITICAL_AREA_IDS = ["ceo_office", "trading_room", "main_lobby", "entrance_building"];

/* ─── Hook: fetch existing checklist ─── */

function useExistingChecklist(date: string, shiftType: string) {
  return useQuery({
    queryKey: ["site-readiness", date, shiftType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_readiness_checklists")
        .select("*")
        .eq("site_id", SITE_ID)
        .eq("date", date)
        .eq("shift_type", shiftType)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/* ─── Component ─── */

interface Props {
  date?: string;
  shiftType?: string;
}

const SiteReadinessChecklist = ({ date, shiftType = "morning" }: Props) => {
  const today = date || new Date().toISOString().split("T")[0];
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: existing, isLoading } = useExistingChecklist(today, shiftType);

  const [submitted, setSubmitted] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    checklist: true, cleaning: true, special: true, workforce: true, handover: true,
  });

  // State
  const [items, setItems] = useState<ChecklistItem[]>(() =>
    CHECKLIST_ITEMS.map((i) => ({ ...i, status: "ok" as ItemStatus, gap_description: "" }))
  );
  const [cleaningActions, setCleaningActions] = useState<CleaningAction[]>(() =>
    CLEANING_ACTIONS.map((a) => ({ ...a, status: "ok" as ItemStatus, gap_description: "", affected_areas: [] }))
  );
  const [specialAreas, setSpecialAreas] = useState<SpecialArea[]>(() =>
    SPECIAL_AREAS.map((a) => ({ ...a, status: "ok" as ItemStatus, gap_description: "", issue_reported: false }))
  );
  const [workforce, setWorkforce] = useState<WorkforceRow[]>([]);
  const [handoverNotes, setHandoverNotes] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  // Load existing
  useEffect(() => {
    if (!existing) return;
    try {
      const ci = existing.checklist_items_json as any[];
      if (ci?.length) setItems(ci);
      const ca = existing.cleaning_actions_json as any[];
      if (ca?.length) setCleaningActions(ca);
      const sa = existing.special_areas_json as any[];
      if (sa?.length) setSpecialAreas(sa);
      const wf = existing.workforce_json as any[];
      if (wf?.length) setWorkforce(wf);
      setHandoverNotes(existing.handover_notes || "");
      setSubmitted(true);
    } catch {}
  }, [existing]);

  // Toggle section
  const toggleSection = (key: string) =>
    setExpandedSections((p) => ({ ...p, [key]: !p[key] }));

  // Validation
  const validate = (): string[] => {
    const errs: string[] = [];

    items.forEach((item) => {
      if (item.status !== "ok" && item.status !== "na" && !item.gap_description.trim()) {
        errs.push(`פריט "${item.label}" — תיאור פער חובה`);
      }
    });

    cleaningActions.forEach((a) => {
      if (a.status !== "ok" && a.status !== "na" && !a.gap_description.trim()) {
        errs.push(`פעולת ניקיון "${a.label}" — תיאור פער חובה`);
      }
    });

    specialAreas.forEach((a) => {
      if (a.status !== "ok" && a.status !== "na" && !a.gap_description.trim()) {
        errs.push(`אזור "${a.label}" — תיאור פער חובה`);
      }
    });

    if (workforce.length === 0) {
      errs.push("יש למלא את טבלת כוח האדם (לפחות עובד אחד)");
    }
    workforce.forEach((w, i) => {
      if (!w.worker_name.trim()) errs.push(`שורה ${i + 1} בטבלת עובדים — שם חסר`);
      if (!w.start_time) errs.push(`שורה ${i + 1} בטבלת עובדים — שעת התחלה חסרה`);
      if (!w.end_time) errs.push(`שורה ${i + 1} בטבלת עובדים — שעת סיום חסרה`);
    });

    if (!handoverNotes.trim()) {
      errs.push("הערות למשמרת הבאה — שדה חובה");
    }

    return errs;
  };

  // Computed workforce summary
  const workforceSummary = useMemo(() => {
    const totalWorkers = workforce.length;
    const totalHours = workforce.reduce((s, w) => s + (w.actual_hours || 0), 0);
    return { totalWorkers, totalHours };
  }, [workforce]);

  // Determine overall status
  const overallStatus = useMemo(() => {
    const allItems = [...items, ...cleaningActions, ...specialAreas];
    const hasNotOk = allItems.some((i) => i.status === "not_ok");
    const hasPartial = allItems.some((i) => i.status === "partial");
    if (hasNotOk || hasPartial) return "submitted_with_exceptions";
    return "submitted";
  }, [items, cleaningActions, specialAreas]);

  // Critical area alerts
  const criticalIssues = useMemo(() => {
    return specialAreas.filter(
      (a) => CRITICAL_AREA_IDS.includes(a.id) && (a.status === "not_ok" || a.status === "partial")
    );
  }, [specialAreas]);

  // Determine next shift info
  const getNextShift = () => {
    if (shiftType === "morning") return { date: today, shift: "evening" };
    const nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + 1);
    return { date: nextDate.toISOString().split("T")[0], shift: "morning" };
  };

  // Determine priority for a gap
  const getGapPriority = (areaId: string, status: ItemStatus, section: string): string => {
    if (CRITICAL_AREA_IDS.includes(areaId)) return "critical";
    if (section === "special_areas" && status === "not_ok") return "critical";
    if (status === "not_ok") return "high";
    if (status === "partial") return "high";
    return "normal";
  };

  // Generate followup tasks from gaps
  const generateFollowupTasks = async (checklistId: string) => {
    const nextShift = getNextShift();
    const gaps: {
      area_name: string;
      area_label: string;
      gap_description: string;
      priority: string;
      source_section: string;
    }[] = [];

    // Collect gaps from all sections
    items.forEach((item) => {
      if ((item.status === "partial" || item.status === "not_ok") || (item.gap_description?.trim())) {
        if (item.status !== "ok" && item.status !== "na") {
          gaps.push({
            area_name: item.id,
            area_label: item.label,
            gap_description: item.gap_description || `סטטוס: ${item.status === "partial" ? "חלקי" : "לא תקין"}`,
            priority: getGapPriority(item.id, item.status, "checklist_items"),
            source_section: "checklist_items",
          });
        }
      }
    });

    cleaningActions.forEach((action) => {
      if (action.status !== "ok" && action.status !== "na") {
        const areasSuffix = action.affected_areas?.length
          ? ` (אזורים: ${action.affected_areas.join(", ")})`
          : "";
        gaps.push({
          area_name: action.id,
          area_label: action.label,
          gap_description: (action.gap_description || `סטטוס: ${action.status === "partial" ? "חלקי" : "לא תקין"}`) + areasSuffix,
          priority: getGapPriority(action.id, action.status, "cleaning_actions"),
          source_section: "cleaning_actions",
        });
      }
    });

    specialAreas.forEach((area) => {
      if (area.status !== "ok" && area.status !== "na") {
        gaps.push({
          area_name: area.id,
          area_label: area.label,
          gap_description: area.gap_description || `סטטוס: ${area.status === "partial" ? "חלקי" : "לא תקין"}`,
          priority: getGapPriority(area.id, area.status, "special_areas"),
          source_section: "special_areas",
        });
      }
    });

    if (gaps.length === 0) return 0;

    const tasksToInsert = gaps.map((g) => ({
      checklist_id: checklistId,
      area_name: g.area_name,
      area_label: g.area_label,
      gap_description: g.gap_description,
      priority: g.priority,
      source_section: g.source_section,
      status: "pending",
      due_date: nextShift.date,
      due_shift_type: nextShift.shift,
    }));

    const { error } = await supabase
      .from("checklist_followup_tasks")
      .insert(tasksToInsert as any);
    if (error) throw error;

    return gaps.length;
  };

  // Save
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("לא מחובר");

      const payload = {
        site_id: SITE_ID,
        date: today,
        shift_type: shiftType,
        submitted_by: user.id,
        checklist_items_json: items as any,
        cleaning_actions_json: cleaningActions as any,
        special_areas_json: specialAreas as any,
        workforce_json: workforce as any,
        total_workers: workforceSummary.totalWorkers,
        total_actual_hours: workforceSummary.totalHours,
        deviation_from_plan: 0,
        handover_notes: handoverNotes,
        overall_status: overallStatus,
      };

      const { data: upserted, error } = await supabase
        .from("site_readiness_checklists")
        .upsert(payload as any, { onConflict: "site_id,date,shift_type" })
        .select("id")
        .single();
      if (error) throw error;

      // Generate followup tasks from gaps
      let gapCount = 0;
      if (upserted?.id) {
        // Delete existing followup tasks for this checklist (re-submit scenario)
        await supabase
          .from("checklist_followup_tasks")
          .delete()
          .eq("checklist_id", upserted.id)
          .eq("status", "pending");

        gapCount = (await generateFollowupTasks(upserted.id)) || 0;
      }

      // Alert for critical area issues
      if (criticalIssues.length > 0) {
        for (const area of criticalIssues) {
          await supabase.from("events_log").insert({
            user_id: user.id,
            site_id: SITE_ID,
            event_type: "sla_alert" as any,
            event_payload: {
              alert_type: "site_readiness_critical_area",
              area_id: area.id,
              area_label: area.label,
              status: area.status,
              gap_description: area.gap_description,
              date: today,
              shift_type: shiftType,
            },
          });
        }
      }

      return { gapCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["site-readiness"] });
      queryClient.invalidateQueries({ queryKey: ["checklist-followup-tasks"] });
      setSubmitted(true);
      toast.success("צ׳קליסט מוכנות אתר נשמר בהצלחה");
      if (result?.gapCount && result.gapCount > 0) {
        toast.info(`${result.gapCount} משימות מעקב נוצרו למשמרת הבאה`, { duration: 5000 });
      }
      if (criticalIssues.length > 0) {
        toast.warning(`${criticalIssues.length} התראות קריטיות נשלחו למנהל התפעול`, { duration: 5000 });
      }
    },
    onError: (err: any) => {
      toast.error("שגיאה בשמירה: " + err.message);
    },
  });

  const handleSubmit = () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (validationErrors.length > 0) {
      toast.error(`${validationErrors.length} שגיאות — יש לתקן לפני שליחה`);
      return;
    }
    saveMutation.mutate();
  };

  // Helpers
  const addWorker = () =>
    setWorkforce((p) => [...p, { id: crypto.randomUUID(), worker_name: "", start_time: "07:00", end_time: "15:00", actual_hours: 8, notes: "" }]);

  const removeWorker = (id: string) =>
    setWorkforce((p) => p.filter((w) => w.id !== id));

  const updateWorker = (id: string, patch: Partial<WorkforceRow>) => {
    setWorkforce((p) =>
      p.map((w) => {
        if (w.id !== id) return w;
        const updated = { ...w, ...patch };
        // Auto-calc hours
        if (updated.start_time && updated.end_time) {
          const [sh, sm] = updated.start_time.split(":").map(Number);
          const [eh, em] = updated.end_time.split(":").map(Number);
          const diff = (eh * 60 + em - sh * 60 - sm) / 60;
          updated.actual_hours = Math.round(diff * 100) / 100;
        }
        return updated;
      })
    );
  };

  const addAffectedArea = (actionIdx: number, area: string) => {
    if (!area.trim()) return;
    setCleaningActions((p) =>
      p.map((a, i) =>
        i === actionIdx ? { ...a, affected_areas: [...a.affected_areas, area.trim()] } : a
      )
    );
  };

  const removeAffectedArea = (actionIdx: number, areaIdx: number) => {
    setCleaningActions((p) =>
      p.map((a, i) =>
        i === actionIdx ? { ...a, affected_areas: a.affected_areas.filter((_, j) => j !== areaIdx) } : a
      )
    );
  };

  if (isLoading) {
    return (
      <div className="task-card animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="task-card border-2 border-primary/30 bg-primary/5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <ClipboardCheck size={20} className="text-primary" />
            צ׳קליסט מוכנות אתר — סוף משמרת
          </h3>
          {submitted && (
            <span className={`status-badge text-[10px] ${overallStatus === "submitted" ? "status-active" : "status-overdue"}`}>
              {overallStatus === "submitted" ? "הוגש תקין" : "הוגש עם חריגות"}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          כל שדה חובה · פערים מתועדים · התראות אוטומטיות לאזורים קריטיים
        </p>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="task-card border-2 border-destructive/40 bg-destructive/5">
          <h4 className="text-sm font-bold text-destructive flex items-center gap-1 mb-2">
            <AlertTriangle size={14} /> {errors.length} שגיאות
          </h4>
          <ul className="space-y-1">
            {errors.map((e, i) => (
              <li key={i} className="text-xs text-destructive">• {e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Section 1: General Checklist */}
      <SectionCard
        title="בקרת פריטים כללית"
        icon={<ClipboardCheck size={16} />}
        expanded={expandedSections.checklist}
        onToggle={() => toggleSection("checklist")}
        count={items.filter((i) => i.status !== "ok" && i.status !== "na").length}
      >
        <div className="space-y-3">
          {items.map((item, idx) => (
            <StatusRow
              key={item.id}
              label={item.label}
              status={item.status}
              gap_description={item.gap_description}
              disabled={submitted}
              onStatusChange={(s) => setItems((p) => p.map((it, i) => i === idx ? { ...it, status: s } : it))}
              onGapChange={(g) => setItems((p) => p.map((it, i) => i === idx ? { ...it, gap_description: g } : it))}
            />
          ))}
        </div>
      </SectionCard>

      {/* Section 2: Cleaning Actions */}
      <SectionCard
        title="פעולות ניקיון חובה"
        icon={<Sparkles size={16} />}
        expanded={expandedSections.cleaning}
        onToggle={() => toggleSection("cleaning")}
        count={cleaningActions.filter((a) => a.status !== "ok" && a.status !== "na").length}
      >
        <div className="space-y-4">
          {cleaningActions.map((action, idx) => (
            <div key={action.id} className="space-y-2">
              <StatusRow
                label={action.label}
                status={action.status}
                gap_description={action.gap_description}
                disabled={submitted}
                onStatusChange={(s) => setCleaningActions((p) => p.map((a, i) => i === idx ? { ...a, status: s } : a))}
                onGapChange={(g) => setCleaningActions((p) => p.map((a, i) => i === idx ? { ...a, gap_description: g } : a))}
              />
              {action.status !== "ok" && action.status !== "na" && (
                <div className="mr-4 animate-slide-up">
                  <label className="text-[10px] font-medium text-muted-foreground mb-1 block">אזורים מושפעים</label>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {action.affected_areas.map((area, aIdx) => (
                      <span key={aIdx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px]">
                        {area}
                        {!submitted && (
                          <button onClick={() => removeAffectedArea(idx, aIdx)} className="hover:text-destructive">
                            <X size={10} />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  {!submitted && (
                    <AffectedAreaInput onAdd={(area) => addAffectedArea(idx, area)} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Section 3: Special Areas */}
      <SectionCard
        title="אזורים מיוחדים"
        icon={<Building2 size={16} />}
        expanded={expandedSections.special}
        onToggle={() => toggleSection("special")}
        count={specialAreas.filter((a) => a.status !== "ok" && a.status !== "na").length}
      >
        <div className="space-y-3">
          {specialAreas.map((area, idx) => {
            const isCritical = CRITICAL_AREA_IDS.includes(area.id);
            return (
              <div key={area.id} className={`${isCritical && area.status !== "ok" && area.status !== "na" ? "ring-1 ring-destructive/40 rounded-lg p-2 bg-destructive/5" : ""}`}>
                <StatusRow
                  label={`${area.label}${isCritical ? " ⚠️" : ""}`}
                  status={area.status}
                  gap_description={area.gap_description}
                  disabled={submitted}
                  onStatusChange={(s) => setSpecialAreas((p) => p.map((a, i) => i === idx ? { ...a, status: s } : a))}
                  onGapChange={(g) => setSpecialAreas((p) => p.map((a, i) => i === idx ? { ...a, gap_description: g } : a))}
                />
                {area.status !== "ok" && area.status !== "na" && (
                  <div className="mr-4 mt-1 animate-slide-up">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={area.issue_reported}
                        onChange={(e) => setSpecialAreas((p) => p.map((a, i) => i === idx ? { ...a, issue_reported: e.target.checked } : a))}
                        disabled={submitted}
                        className="rounded border-border"
                      />
                      <Send size={12} className="text-info" />
                      דווח לתפעול
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Section 4: Workforce Table */}
      <SectionCard
        title="טבלת כוח אדם"
        icon={<Users size={16} />}
        expanded={expandedSections.workforce}
        onToggle={() => toggleSection("workforce")}
        badge={`${workforceSummary.totalWorkers} עובדים · ${workforceSummary.totalHours.toFixed(1)} שעות`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right">
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">שם עובד</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium w-24">התחלה</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium w-24">סיום</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium w-20">שעות</th>
                <th className="py-2 px-2 text-xs text-muted-foreground font-medium">הערות</th>
                {!submitted && <th className="py-2 px-2 w-10" />}
              </tr>
            </thead>
            <tbody>
              {workforce.map((w) => (
                <tr key={w.id} className="border-b border-border/50">
                  <td className="py-2 px-2">
                    <Input
                      value={w.worker_name}
                      onChange={(e) => updateWorker(w.id, { worker_name: e.target.value })}
                      disabled={submitted}
                      className="h-8 text-xs"
                      placeholder="שם העובד"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <Input
                      type="time"
                      value={w.start_time}
                      onChange={(e) => updateWorker(w.id, { start_time: e.target.value })}
                      disabled={submitted}
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <Input
                      type="time"
                      value={w.end_time}
                      onChange={(e) => updateWorker(w.id, { end_time: e.target.value })}
                      disabled={submitted}
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="py-2 px-2 mono text-xs text-center font-semibold">
                    {w.actual_hours.toFixed(1)}
                  </td>
                  <td className="py-2 px-2">
                    <Input
                      value={w.notes}
                      onChange={(e) => updateWorker(w.id, { notes: e.target.value })}
                      disabled={submitted}
                      className="h-8 text-xs"
                      placeholder="הערות"
                    />
                  </td>
                  {!submitted && (
                    <td className="py-2 px-2">
                      <button onClick={() => removeWorker(w.id)} className="p-1 hover:text-destructive">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!submitted && (
          <button
            onClick={addWorker}
            className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium"
          >
            <Plus size={14} /> הוסף עובד
          </button>
        )}
        {workforce.length > 0 && (
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground border-t border-border pt-2">
            <span>סה״כ עובדים: <strong className="text-foreground">{workforceSummary.totalWorkers}</strong></span>
            <span>סה״כ שעות: <strong className="text-foreground">{workforceSummary.totalHours.toFixed(1)}</strong></span>
          </div>
        )}
      </SectionCard>

      {/* Section 5: Handover Notes */}
      <SectionCard
        title="הערות חשובות למשמרת הבאה"
        icon={<FileText size={16} />}
        expanded={expandedSections.handover}
        onToggle={() => toggleSection("handover")}
        required
      >
        <Textarea
          value={handoverNotes}
          onChange={(e) => setHandoverNotes(e.target.value)}
          disabled={submitted}
          placeholder="תאר מצבים מיוחדים, בעיות פתוחות, או הנחיות למשמרת הבאה..."
          className="min-h-[100px] text-sm"
        />
        {!handoverNotes.trim() && !submitted && (
          <p className="text-[10px] text-destructive mt-1">שדה חובה — לא ניתן להגיש ללא מילוי</p>
        )}
      </SectionCard>

      {/* Submit */}
      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Send size={16} />
          {saveMutation.isPending ? "שומר..." : "הגש צ׳קליסט מוכנות אתר"}
        </button>
      ) : (
        <div className={`task-card text-center ${overallStatus === "submitted" ? "border-success/40 bg-success/5" : "border-warning/40 bg-warning/5"}`}>
          <CheckCircle2 size={24} className={overallStatus === "submitted" ? "text-success mx-auto mb-2" : "text-warning mx-auto mb-2"} />
          <p className="text-sm font-semibold">
            {overallStatus === "submitted" ? "צ׳קליסט הוגש — מוכנות תקינה" : "צ׳קליסט הוגש — עם חריגות"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {workforceSummary.totalWorkers} עובדים · {workforceSummary.totalHours.toFixed(1)} שעות
          </p>
        </div>
      )}
    </div>
  );
};

/* ─── Sub-components ─── */

function SectionCard({
  title, icon, expanded, onToggle, children, count, badge, required,
}: {
  title: string; icon: React.ReactNode; expanded: boolean; onToggle: () => void;
  children: React.ReactNode; count?: number; badge?: string; required?: boolean;
}) {
  return (
    <div className="task-card">
      <button onClick={onToggle} className="w-full flex items-center justify-between mb-0">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          {icon} {title}
          {required && <span className="text-destructive text-[10px]">חובה</span>}
          {typeof count === "number" && count > 0 && (
            <span className="status-badge status-overdue text-[10px]">{count} חריגות</span>
          )}
          {badge && <span className="text-[10px] text-muted-foreground font-normal">{badge}</span>}
        </h4>
        {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>
      {expanded && <div className="mt-3">{children}</div>}
    </div>
  );
}

function StatusRow({
  label, status, gap_description, disabled, onStatusChange, onGapChange,
}: {
  label: string; status: ItemStatus; gap_description: string; disabled: boolean;
  onStatusChange: (s: ItemStatus) => void; onGapChange: (g: string) => void;
}) {
  const needsGap = status !== "ok" && status !== "na";
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium flex-1">{label}</span>
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = status === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onStatusChange(opt.value)}
                disabled={disabled}
                title={opt.label}
                className={`p-1.5 rounded-md border transition-all ${
                  selected
                    ? opt.value === "ok"
                      ? "bg-success/15 border-success text-success"
                      : opt.value === "partial"
                        ? "bg-warning/15 border-warning text-warning"
                        : opt.value === "not_ok"
                          ? "bg-destructive/15 border-destructive text-destructive"
                          : "bg-muted border-border text-muted-foreground"
                    : "border-transparent text-muted-foreground/40 hover:text-muted-foreground hover:border-border"
                } disabled:opacity-60`}
              >
                <Icon size={14} />
              </button>
            );
          })}
        </div>
      </div>
      {needsGap && (
        <div className="mt-1 mr-2 animate-slide-up">
          <Textarea
            value={gap_description}
            onChange={(e) => onGapChange(e.target.value)}
            placeholder="תיאור הפער..."
            className="text-xs min-h-[40px]"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

function AffectedAreaInput({ onAdd }: { onAdd: (area: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex gap-1">
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onAdd(val); setVal(""); }
        }}
        placeholder="הוסף אזור מושפע..."
        className="h-7 text-[10px] flex-1"
      />
      <button
        onClick={() => { onAdd(val); setVal(""); }}
        className="px-2 h-7 rounded bg-muted text-xs hover:bg-muted/80"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}

export default SiteReadinessChecklist;
