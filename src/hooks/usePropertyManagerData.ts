import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

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
  tasks: {
    id: string;
    task_name: string;
    standard_minutes: number;
    priority: string;
    location_id: string;
    location_name: string;
    recurrence_rule: any;
    checklist_json: any;
  }[];
}

/* ─── Staff profiles (cleaning_staff only) ─── */
export function useStaffProfiles() {
  return useQuery({
    queryKey: ["pm-staff-profiles"],
    queryFn: async () => {
      // Get all cleaning_staff user_ids
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

/* ─── Task templates with their tasks ─── */
export function useTaskTemplates() {
  return useQuery({
    queryKey: ["pm-task-templates"],
    queryFn: async () => {
      const { data: templates } = await supabase
        .from("task_templates")
        .select("id, name, shift_type, active")
        .eq("site_id", SITE_ID)
        .eq("active", true)
        .order("name");

      if (!templates?.length) return [] as TemplateWithTasks[];

      const templateIds = templates.map((t) => t.id);
      const { data: tasks } = await supabase
        .from("template_tasks")
        .select("id, task_name, standard_minutes, priority, location_id, recurrence_rule, checklist_json, template_id")
        .in("template_id", templateIds);

      // Get location names
      const locationIds = [...new Set((tasks || []).map((t) => t.location_id))];
      const { data: locations } = await supabase
        .from("campus_locations")
        .select("id, name")
        .in("id", locationIds);

      const locMap = Object.fromEntries((locations || []).map((l) => [l.id, l.name]));

      return templates.map((tmpl) => ({
        id: tmpl.id,
        name: tmpl.name,
        shift_type: tmpl.shift_type,
        tasks: (tasks || [])
          .filter((t) => t.template_id === tmpl.id)
          .map((t) => ({
            ...t,
            location_name: locMap[t.location_id] || "—",
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
        .select("id, staff_user_id, template_id, shift_type, status, date")
        .eq("site_id", SITE_ID)
        .eq("date", d);
      return data || [];
    },
  });
}

/* ─── Create assignment + materialize tasks ─── */
export function useCreateAssignment() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      staffId: string;
      templateId: string;
      shiftType: "morning" | "evening";
      date: string;
    }) => {
      // Create assignment
      const { data: assignment, error: aErr } = await supabase
        .from("assignments")
        .insert({
          staff_user_id: params.staffId,
          template_id: params.templateId,
          shift_type: params.shiftType,
          date: params.date,
          site_id: SITE_ID,
          created_by: user?.id || null,
          status: "planned",
        })
        .select("id")
        .single();

      if (aErr) throw aErr;

      // Fetch template tasks
      const { data: tasks } = await supabase
        .from("template_tasks")
        .select("*")
        .eq("template_id", params.templateId);

      if (tasks?.length) {
        // Materialize: create assigned_tasks
        const shiftStart = params.shiftType === "morning" ? "07:00" : "16:00";
        let cursor = shiftStart;

        const assignedTasks = tasks.map((t, i) => {
          const [h, m] = cursor.split(":").map(Number);
          const startDate = new Date(`${params.date}T${cursor}:00`);
          const endDate = new Date(startDate.getTime() + t.standard_minutes * 60000);
          cursor = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;

          return {
            assignment_id: assignment.id,
            task_name: t.task_name,
            location_id: t.location_id,
            standard_minutes: t.standard_minutes,
            priority: t.priority,
            checklist_json: t.checklist_json,
            sequence_order: i + 1,
            window_start: startDate.toISOString(),
            window_end: endDate.toISOString(),
            status: "queued" as const,
          };
        });

        const { error: tErr } = await supabase
          .from("assigned_tasks")
          .insert(assignedTasks);
        if (tErr) throw tErr;
      }

      return assignment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-assignments"] });
      toast({ title: "שיבוץ נוצר בהצלחה" });
    },
    onError: (err: any) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });
}

export { SITE_ID };
