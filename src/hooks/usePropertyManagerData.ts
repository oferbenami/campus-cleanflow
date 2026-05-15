import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { generateAssignmentTasks } from "@/lib/task-generation";

const SITE_ID = "37027ccd-c7d7-4d77-988d-6da914e347b4";

export interface StaffProfile {
  id: string;
  full_name: string;
  avatar_initials: string | null;
  email: string | null;
  role: string;
  default_shift_start: string | null;
  default_shift_end: string | null;
  default_work_days: number[] | null;
}

export interface TemplateWithTasks {
  id: string;
  name: string;
  shift_type: string | null;
  template_type: string;
  description: string | null;
  tasks: {
    id: string;
    task_name: string;
    standard_minutes: number;
    priority: string;
    location_id: string;
    location_name: string;
    recurrence_rule: any;
    checklist_json: any;
    days_of_week: number[];
    window_start: string | null;
    window_end: string | null;
    is_optional: boolean;
  }[];
}

/* ─── Staff profiles (cleaning_staff only) ─── */
export function useStaffProfiles() {
  return useQuery({
    queryKey: ["pm-staff-profiles"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "cleaning_staff");
      if (!roles?.length) return [] as StaffProfile[];

      const staffIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_initials, email, role, default_shift_start, default_shift_end, default_work_days")
        .in("id", staffIds);

      return (profiles || []).map((p) => ({
        ...p,
        role: "cleaning_staff",
        default_work_days: p.default_work_days as number[] | null,
      })) as StaffProfile[];
    },
  });
}

/* ─── Task templates with their tasks (filtered by type) ─── */
export function useTaskTemplates(templateType?: "base" | "addon") {
  return useQuery({
    queryKey: ["pm-task-templates", templateType],
    queryFn: async () => {
      let query = supabase
        .from("task_templates")
        .select("id, name, shift_type, active, template_type, description")
        .eq("site_id", SITE_ID)
        .eq("active", true)
        .order("name");

      if (templateType) {
        query = query.eq("template_type", templateType);
      }

      const { data: templates } = await query;
      if (!templates?.length) return [] as TemplateWithTasks[];

      const templateIds = templates.map((t) => t.id);
      const { data: tasks } = await supabase
        .from("template_tasks")
        .select("id, task_name, standard_minutes, priority, location_id, recurrence_rule, checklist_json, template_id, days_of_week, window_start, window_end, is_optional")
        .in("template_id", templateIds);

      const locationIds = [...new Set((tasks || []).map((t) => t.location_id))];
      const { data: locations } = await supabase
        .from("campus_locations")
        .select("id, name")
        .in("id", locationIds.length ? locationIds : ["00000000-0000-0000-0000-000000000000"]);

      const locMap = Object.fromEntries((locations || []).map((l) => [l.id, l.name]));

      return templates.map((tmpl) => ({
        id: tmpl.id,
        name: tmpl.name,
        shift_type: tmpl.shift_type,
        template_type: tmpl.template_type || "base",
        description: (tmpl as any).description || null,
        tasks: (tasks || [])
          .filter((t) => t.template_id === tmpl.id)
          .map((t) => ({
            ...t,
            location_name: locMap[t.location_id] || "—",
            days_of_week: (t as any).days_of_week || [0, 1, 2, 3, 4],
            window_start: (t as any).window_start || null,
            window_end: (t as any).window_end || null,
            is_optional: (t as any).is_optional || false,
          })),
      })) as TemplateWithTasks[];
    },
  });
}

/* ─── Today's assignments ─── */
export function useTodayAssignments(date?: string) {
  const d = date || new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: ["pm-assignments", d],
    queryFn: async () => {
      const { data } = await supabase
        .from("assignments")
        .select("id, staff_user_id, template_id, shift_type, status, date, work_package_id")
        .eq("site_id", SITE_ID)
        .eq("date", d);
      return data || [];
    },
  });
}

/* ─── Assignment add-ons for a given date ─── */
export function useAssignmentAddons(date?: string) {
  const d = date || new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: ["pm-assignment-addons", d],
    queryFn: async () => {
      // First get assignment IDs for this date
      const { data: assignments } = await supabase
        .from("assignments")
        .select("id")
        .eq("site_id", SITE_ID)
        .eq("date", d);

      if (!assignments?.length) return [];

      const assignmentIds = assignments.map((a) => a.id);
      const { data } = await supabase
        .from("assignment_addons")
        .select("id, assignment_id, addon_template_id, apply_mode, notes")
        .in("assignment_id", assignmentIds);

      return data || [];
    },
  });
}

/* ─── Create assignment with BASE + optional ADD-ONS ─── */
export function useCreateAssignment() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      staffId: string;
      templateId?: string;
      workPackageId?: string;
      shiftType: "morning" | "evening";
      date: string;
      addonTemplateIds?: string[];
      /** If provided, only create tasks at these indices from the WP (for split assignments) */
      selectedTaskIndices?: number[];
    }) => {
      // Create assignment
      const { data: assignment, error: aErr } = await supabase
        .from("assignments")
        .insert({
          staff_user_id: params.staffId,
          template_id: params.templateId || null,
          work_package_id: params.workPackageId || null,
          shift_type: params.shiftType,
          date: params.date,
          site_id: SITE_ID,
          created_by: user?.id || null,
          status: "planned",
        } as any)
        .select("id")
        .single();

      if (aErr) throw aErr;

      // If work package based, generate tasks from work_package_tasks
      if (params.workPackageId) {
        const { data: wpTasks } = await supabase
          .from("work_package_tasks")
          .select("*")
          .eq("work_package_id", params.workPackageId);

        if (wpTasks?.length) {
          // Filter tasks by selected indices if doing a split assignment
          const filteredTasks = params.selectedTaskIndices
            ? wpTasks.filter((_, i) => params.selectedTaskIndices!.includes(i))
            : wpTasks;

          if (filteredTasks.length === 0) return assignment;

          // We need a location_id for assigned_tasks. Use a fallback.
          const { data: fallbackLoc } = await supabase
            .from("campus_locations")
            .select("id")
            .eq("site_id", SITE_ID)
            .limit(1)
            .maybeSingle();

          const fallbackLocationId = fallbackLoc?.id || "00000000-0000-0000-0000-000000000000";
          const shiftStart = params.shiftType === "morning" ? "07:00" : "16:00";
          let cursor = shiftStart;

          const tasksToInsert = filteredTasks.map((t, i) => {
            const startDate = new Date(`${params.date}T${cursor}:00`);
            const mins = Number(t.standard_minutes) || 30;
            const endDate = new Date(startDate.getTime() + mins * 60000);
            cursor = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;

            return {
              assignment_id: assignment.id,
              task_name: [t.space_type, t.description, t.cleaning_type].filter(Boolean).join(" - ") || `משימה ${i + 1}`,
              location_id: fallbackLocationId,
              standard_minutes: mins,
              priority: "normal" as const,
              checklist_json: [],
              sequence_order: i + 1,
              queue_order: i + 1,
              window_start: startDate.toISOString(),
              window_end: endDate.toISOString(),
              status: "queued" as const,
              source_type: "base",
            };
          });

          const { error: tErr } = await supabase.from("assigned_tasks").insert(tasksToInsert);
          if (tErr) throw tErr;
        }
      } else if (params.templateId) {
        // Create assignment_addons records
        if (params.addonTemplateIds?.length) {
          const { error: aaErr } = await supabase
            .from("assignment_addons")
            .insert(
              params.addonTemplateIds.map((addonId) => ({
                assignment_id: assignment.id,
                addon_template_id: addonId,
                apply_mode: "merge",
              }))
            );
          if (aaErr) throw aaErr;
        }

        // Generate tasks (BASE + ADD-ONS merged)
        await generateAssignmentTasks(
          assignment.id,
          params.templateId,
          params.addonTemplateIds || [],
          params.date,
          params.shiftType
        );
      }

      return assignment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-assignments"] });
      qc.invalidateQueries({ queryKey: ["pm-assignment-addons"] });
      toast({ title: "שיבוץ נוצר בהצלחה" });
    },
    onError: (err: any) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });
}

/* ─── Create/update template ─── */
export function useCreateTemplate() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      templateType: "base" | "addon";
      shiftType: "morning" | "evening";
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from("task_templates")
        .insert({
          name: params.name,
          template_type: params.templateType,
          shift_type: params.shiftType,
          description: params.description || null,
          site_id: SITE_ID,
          created_by: user?.id || null,
          active: true,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-task-templates"] });
      toast({ title: "תבנית נוצרה בהצלחה" });
    },
    onError: (err: any) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });
}

export function useAddTemplateTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      templateId: string;
      taskName: string;
      locationId: string;
      standardMinutes: number;
      priority: "normal" | "high";
      daysOfWeek: number[];
      windowStart?: string;
      windowEnd?: string;
      checklistJson?: any;
      isOptional?: boolean;
    }) => {
      const { error } = await supabase
        .from("template_tasks")
        .insert({
          template_id: params.templateId,
          task_name: params.taskName,
          location_id: params.locationId,
          standard_minutes: params.standardMinutes,
          priority: params.priority,
          days_of_week: params.daysOfWeek,
          window_start: params.windowStart || null,
          window_end: params.windowEnd || null,
          checklist_json: params.checklistJson || [],
          is_optional: params.isOptional || false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-task-templates"] });
      toast({ title: "משימה נוספה" });
    },
    onError: (err: any) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteTemplateTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("template_tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-task-templates"] });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase.from("task_templates").delete().eq("id", templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-task-templates"] });
      toast({ title: "תבנית נמחקה" });
    },
    onError: (err: any) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });
}

/* ─── Locations for dropdowns ─── */
export function useCampusLocations() {
  return useQuery({
    queryKey: ["pm-campus-locations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("campus_locations")
        .select("id, name, level_type, parent_location_id")
        .eq("site_id", SITE_ID)
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });
}

/* ─── Auto-generate assignments from permanent position assignments ─── */

/**
 * Idempotent: creates `assignments` for any permanent position assignment
 * that doesn't have one for today yet. Filters by day type (regular / friday_eve / holiday).
 */
export function useAutoGeneratePermanentAssignments() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { date: string; shift: "morning" | "evening" }) => {
      const { date, shift } = params;

      // Determine today's day type
      const dateObj = new Date(date);
      const { data: specialDays } = await (supabase as any)
        .from("special_calendar_days")
        .select("date, day_type")
        .eq("date", date);

      let dayType: string = "regular";
      const special = (specialDays || []).find((d: any) => d.date === date);
      if (special) {
        dayType = special.day_type === "holiday_eve" ? "friday_eve" : "holiday";
      } else {
        const dow = dateObj.getDay();
        if (dow === 6) dayType = "holiday";
        else if (dow === 5) dayType = "friday_eve";
      }

      // Fetch active permanent position assignments for the given shift
      const { data: posAssignments, error: paErr } = await (supabase as any)
        .from("staffing_position_assignments")
        .select(`
          id,
          staffing_position_id,
          staff_user_id,
          applicable_day_types,
          staffing_positions!staffing_position_id(id, shift_type, active)
        `)
        .lte("effective_from", date)
        .or(`effective_until.is.null,effective_until.gte.${date}`);

      if (paErr) throw paErr;

      // Filter: matching shift + day type
      const relevant = (posAssignments || []).filter((pa: any) => {
        const pos = pa.staffing_positions;
        if (!pos || !pos.active) return false;
        if (pos.shift_type !== shift) return false;
        return (pa.applicable_day_types || []).includes(dayType);
      });

      if (!relevant.length) return { generated: 0 };

      // Fetch existing assignments for today (to avoid duplicates)
      const { data: existing } = await supabase
        .from("assignments")
        .select("position_id, staff_user_id")
        .eq("site_id", SITE_ID)
        .eq("date", date)
        .eq("shift_type", shift);

      const existingKeys = new Set(
        (existing || [])
          .filter((a: any) => a.position_id)
          .map((a: any) => `${a.staff_user_id}__${a.position_id}`)
      );

      // Fetch a fallback location once
      const { data: fallbackLoc } = await supabase
        .from("campus_locations")
        .select("id")
        .eq("site_id", SITE_ID)
        .limit(1)
        .maybeSingle();
      const fallbackLocationId = fallbackLoc?.id || "00000000-0000-0000-0000-000000000000";

      const shiftStart = shift === "morning" ? "07:00" : "16:00";
      let generated = 0;

      for (const pa of relevant) {
        const key = `${pa.staff_user_id}__${pa.staffing_position_id}`;
        if (existingKeys.has(key)) continue;

        // Fetch work packages for this position
        const { data: posPkgs } = await (supabase as any)
          .from("staffing_position_packages")
          .select("work_package_id")
          .eq("staffing_position_id", pa.staffing_position_id);

        const wpIds: string[] = (posPkgs || []).map((p: any) => p.work_package_id);
        if (!wpIds.length) continue;

        for (const wpId of wpIds) {
          // Create one assignment per work package (matching existing convention)
          const { data: assignment, error: aErr } = await supabase
            .from("assignments")
            .insert({
              staff_user_id: pa.staff_user_id,
              work_package_id: wpId,
              shift_type: shift,
              date,
              site_id: SITE_ID,
              created_by: user?.id || null,
              status: "planned",
              position_id: pa.staffing_position_id,
            } as any)
            .select("id")
            .single();

          if (aErr) {
            console.error("Auto-generate assignment error:", aErr.message);
            continue;
          }

          // Generate tasks from work_package_tasks
          const { data: wpTasks } = await supabase
            .from("work_package_tasks")
            .select("*")
            .eq("work_package_id", wpId);

          if (wpTasks?.length) {
            let cursor = shiftStart;
            const tasksToInsert = wpTasks.map((t: any, i: number) => {
              const startDate = new Date(`${date}T${cursor}:00`);
              const mins = Number(t.standard_minutes) || 30;
              const endDate = new Date(startDate.getTime() + mins * 60000);
              cursor = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
              return {
                assignment_id: assignment.id,
                task_name: [t.space_type, t.description, t.cleaning_type].filter(Boolean).join(" - ") || `משימה ${i + 1}`,
                location_id: fallbackLocationId,
                standard_minutes: mins,
                priority: "normal" as const,
                checklist_json: [],
                sequence_order: i + 1,
                queue_order: i + 1,
                window_start: startDate.toISOString(),
                window_end: endDate.toISOString(),
                status: "queued" as const,
                source_type: "base",
              };
            });

            await supabase.from("assigned_tasks").insert(tasksToInsert);
          }
        }

        generated++;
      }

      return { generated };
    },
    onSuccess: ({ generated }: { generated: number }) => {
      if (generated > 0) {
        qc.invalidateQueries({ queryKey: ["pm-assignments"] });
        toast({ title: `שובצו ${generated} עובדים אוטומטית מתקנות קבועות` });
      }
    },
    onError: (err: any) => {
      console.error("Auto-generate failed:", err.message);
    },
  });
}

export { SITE_ID };
