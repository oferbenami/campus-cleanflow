import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Json } from "@/integrations/supabase/types";

export interface SupervisorStaff {
  id: string;
  full_name: string;
  avatar_initials: string | null;
  status: "active" | "break" | "idle";
}

export interface SupervisorTask {
  id: string;
  assignment_id: string;
  task_name: string;
  location_name: string;
  location_id: string;
  standard_minutes: number;
  actual_minutes: number | null;
  status: string;
  priority: string;
  started_at: string | null;
  finished_at: string | null;
  variance_percent: number | null;
  staff_user_id: string;
  staff_name: string;
}

export interface BreakFixTicket {
  id: string;
  description: string;
  priority: string;
  status: string;
  location_name: string;
  location_id: string;
  created_at: string;
  created_by_name: string;
  assigned_to_name: string | null;
  photo_url: string | null;
}

export interface AuditInspection {
  id: string;
  assigned_task_id: string;
  task_name: string;
  total_score: number;
  scores_json: Record<string, number>;
  notes: string | null;
  created_at: string;
  inspector_name: string;
}

export interface DeferredTaskEvent {
  id: string;
  task_id: string;
  task_name: string;
  location_name: string;
  staff_name: string;
  staff_user_id: string;
  reason: string;
  reason_code: string;
  defer_action: string;
  note: string | null;
  created_at: string;
  defer_count: number;
  partial_elapsed_minutes: number;
  is_critical: boolean;
  is_escalation: boolean;
  // SLA risk
  task_status: string | null;
  standard_minutes: number | null;
  window_end: string | null;
}

export interface LocationOption {
  id: string;
  name: string;
  level_type: string;
  parent_name: string | null;
}

export function useSupervisorData() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<SupervisorStaff[]>([]);
  const [tasks, setTasks] = useState<SupervisorTask[]>([]);
  const [tickets, setTickets] = useState<BreakFixTicket[]>([]);
  const [audits, setAudits] = useState<AuditInspection[]>([]);
  const [deferredEvents, setDeferredEvents] = useState<DeferredTaskEvent[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Get site_id from supervisor's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("site_id")
        .eq("id", user.id)
        .single();

      const siteId = profile?.site_id || "37027ccd-c7d7-4d77-988d-6da914e347b4";

      // Fetch all in parallel
      const [assignmentsRes, ticketsRes, auditsRes, locationsRes, staffRes, deferredRes] = await Promise.all([
        // Today's assignments with tasks
        supabase
          .from("assignments")
          .select(`
            id, staff_user_id, shift_type, status,
            profiles!assignments_staff_user_id_fkey ( full_name, avatar_initials ),
            assigned_tasks (
              id, task_name, standard_minutes, actual_minutes, status, priority,
              started_at, finished_at, variance_percent, location_id,
              campus_locations!assigned_tasks_location_id_fkey ( name )
            )
          `)
          .eq("date", today)
          .eq("site_id", siteId),

        // Break-fix tickets (today)
        supabase
          .from("break_fix_tickets")
          .select(`
            id, description, priority, status, location_id, created_at, photo_url,
            campus_locations!break_fix_tickets_location_id_fkey ( name ),
            creator:profiles!break_fix_tickets_created_by_fkey ( full_name ),
            assignee:profiles!break_fix_tickets_assigned_to_user_id_fkey ( full_name )
          `)
          .eq("site_id", siteId)
          .gte("created_at", `${today}T00:00:00`)
          .order("created_at", { ascending: false }),

        // Audit inspections (last 7 days)
        supabase
          .from("audit_inspections")
          .select(`
            id, assigned_task_id, total_score, scores_json, notes, created_at,
            profiles!audit_inspections_inspector_user_id_fkey ( full_name ),
            assigned_tasks!audit_inspections_assigned_task_id_fkey ( task_name )
          `)
          .eq("site_id", siteId)
          .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
          .order("created_at", { ascending: false }),

        // Locations for break-fix form
        supabase
          .from("campus_locations")
          .select("id, name, level_type, parent_location_id")
          .eq("site_id", siteId)
          .eq("is_active", true)
          .in("level_type", ["room", "zone"])
          .order("name"),

        // Staff profiles
        supabase
          .from("profiles")
          .select("id, full_name, avatar_initials, role")
          .eq("role", "cleaning_staff"),

        // Deferred / cannot_perform events (today) — both legacy sla_alert and new task_deferred
        supabase
          .from("events_log")
          .select(`
            id, event_type, event_payload, created_at, user_id, assigned_task_id,
            profiles!events_log_user_id_fkey ( full_name ),
            assigned_tasks!events_log_assigned_task_id_fkey ( task_name, status, standard_minutes, window_end, location_id, defer_count, is_deferred,
              campus_locations!assigned_tasks_location_id_fkey ( name )
            )
          `)
          .in("event_type", ["sla_alert", "task_deferred"])
          .eq("site_id", siteId)
          .gte("created_at", `${today}T00:00:00`)
          .order("created_at", { ascending: false }),
      ]);

      // Map staff
      const staffList: SupervisorStaff[] = (staffRes.data || []).map((s: any) => ({
        id: s.id,
        full_name: s.full_name,
        avatar_initials: s.avatar_initials,
        status: "active" as const,
      }));
      setStaff(staffList);

      // Map tasks from assignments
      const allTasks: SupervisorTask[] = [];
      (assignmentsRes.data || []).forEach((a: any) => {
        const staffName = a.profiles?.full_name || "";
        (a.assigned_tasks || []).forEach((t: any) => {
          allTasks.push({
            id: t.id,
            assignment_id: a.id,
            task_name: t.task_name,
            location_name: t.campus_locations?.name || "",
            location_id: t.location_id,
            standard_minutes: t.standard_minutes,
            actual_minutes: t.actual_minutes,
            status: t.status,
            priority: t.priority,
            started_at: t.started_at,
            finished_at: t.finished_at,
            variance_percent: t.variance_percent,
            staff_user_id: a.staff_user_id,
            staff_name: staffName,
          });
        });
      });
      setTasks(allTasks);

      // Map tickets
      const ticketList: BreakFixTicket[] = (ticketsRes.data || []).map((t: any) => ({
        id: t.id,
        description: t.description,
        priority: t.priority,
        status: t.status,
        location_name: t.campus_locations?.name || "",
        location_id: t.location_id,
        created_at: t.created_at,
        created_by_name: t.creator?.full_name || "",
        assigned_to_name: t.assignee?.full_name || null,
        photo_url: t.photo_url,
      }));
      setTickets(ticketList);

      // Map audits
      const auditList: AuditInspection[] = (auditsRes.data || []).map((a: any) => ({
        id: a.id,
        assigned_task_id: a.assigned_task_id,
        task_name: a.assigned_tasks?.task_name || "",
        total_score: a.total_score,
        scores_json: (a.scores_json || {}) as Record<string, number>,
        notes: a.notes,
        created_at: a.created_at,
        inspector_name: a.profiles?.full_name || "",
      }));
      setAudits(auditList);

      // Map locations
      const locationList: LocationOption[] = (locationsRes.data || []).map((l: any) => ({
        id: l.id,
        name: l.name,
        level_type: l.level_type,
        parent_name: null,
      }));
      setLocations(locationList);

      // Map deferred events (cannot_perform actions from sla_alert + task_deferred events)
      const deferredList: DeferredTaskEvent[] = (deferredRes.data || [])
        .filter((e: any) => {
          const payload = e.event_payload as any;
          return payload?.action === "cannot_perform" || e.event_type === "task_deferred";
        })
        .map((e: any) => {
          const payload = e.event_payload as any;
          const task = e.assigned_tasks;
          return {
            id: e.id,
            task_id: e.assigned_task_id || "",
            task_name: task?.task_name || payload?.task_name || "",
            location_name: task?.campus_locations?.name || payload?.location || "",
            staff_name: e.profiles?.full_name || "",
            staff_user_id: e.user_id,
            reason: payload?.reason || "",
            reason_code: payload?.reason_code || "",
            defer_action: payload?.defer_action || "",
            note: payload?.note || null,
            created_at: e.created_at,
            defer_count: payload?.defer_count || task?.defer_count || 0,
            partial_elapsed_minutes: payload?.partial_elapsed_minutes || 0,
            is_critical: payload?.is_critical || false,
            is_escalation: payload?.is_escalation || false,
            task_status: task?.status || null,
            standard_minutes: task?.standard_minutes || null,
            window_end: task?.window_end || null,
          };
        });
      setDeferredEvents(deferredList);

    } catch (err) {
      console.error("Supervisor data fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, today]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Actions ──

  const createBreakFixTicket = useCallback(async (
    locationId: string,
    description: string,
    priority: "urgent" | "high" | "normal" = "normal"
  ) => {
    if (!user?.id) return;
    const siteId = "37027ccd-c7d7-4d77-988d-6da914e347b4";

    const { error } = await supabase.from("break_fix_tickets").insert({
      created_by: user.id,
      location_id: locationId,
      site_id: siteId,
      description,
      priority: priority as any,
    });

    if (error) throw error;

    // Log event
    await supabase.from("events_log").insert({
      user_id: user.id,
      site_id: siteId,
      event_type: "break_fix_created" as any,
      event_payload: { location_id: locationId, description },
    });

    await fetchData();
  }, [user?.id, fetchData]);

  const submitAudit = useCallback(async (
    assignedTaskId: string,
    scores: Record<string, number>,
    notes: string
  ) => {
    if (!user?.id) return;
    const siteId = "37027ccd-c7d7-4d77-988d-6da914e347b4";
    const totalScore = Object.values(scores).reduce((s, v) => s + v, 0) / Object.values(scores).length;

    const { error } = await supabase.from("audit_inspections").insert({
      inspector_user_id: user.id,
      assigned_task_id: assignedTaskId,
      site_id: siteId,
      scores_json: scores as any,
      total_score: Math.round(totalScore * 10) / 10,
      notes: notes || null,
    });

    if (error) throw error;
    await fetchData();
  }, [user?.id, fetchData]);

  return {
    staff,
    tasks,
    tickets,
    audits,
    deferredEvents,
    locations,
    loading,
    createBreakFixTicket,
    submitAudit,
    refetch: fetchData,
  };
}
