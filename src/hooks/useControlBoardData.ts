import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface CBWorker {
  id: string;
  full_name: string;
  avatar_initials: string | null;
  shift_type: "morning" | "evening";
  assignment_id: string;
  total_planned_minutes: number;
  shift_capacity_minutes: number;
}

export interface CBTask {
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
  window_start: string | null;
  window_end: string | null;
  sequence_order: number;
  is_deferred: boolean;
  defer_count: number;
  staff_user_id: string;
  checklist_json: any;
}

export interface CBTicket {
  id: string;
  description: string;
  priority: string;
  status: string;
  location_name: string;
  location_id: string;
  assigned_to_user_id: string | null;
  assigned_to_name: string | null;
  created_at: string;
}

export function useControlBoardData(selectedDate: string) {
  const { user } = useAuth();
  const [workers, setWorkers] = useState<CBWorker[]>([]);
  const [tasks, setTasks] = useState<CBTask[]>([]);
  const [tickets, setTickets] = useState<CBTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteId, setSiteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("site_id")
        .eq("id", user.id)
        .single();

      const sid = profile?.site_id || "37027ccd-c7d7-4d77-988d-6da914e347b4";
      setSiteId(sid);

      const [assignmentsRes, ticketsRes] = await Promise.all([
        supabase
          .from("assignments")
          .select(`
            id, staff_user_id, shift_type, status,
            profiles!assignments_staff_user_id_fkey ( full_name, avatar_initials, default_shift_start, default_shift_end, default_break_minutes ),
            assigned_tasks (
              id, task_name, standard_minutes, actual_minutes, status, priority,
              started_at, finished_at, window_start, window_end, sequence_order, is_deferred, defer_count, checklist_json, location_id,
              campus_locations!assigned_tasks_location_id_fkey ( name )
            )
          `)
          .eq("date", selectedDate)
          .eq("site_id", sid),

        supabase
          .from("break_fix_tickets")
          .select(`
            id, description, priority, status, location_id, assigned_to_user_id, created_at,
            campus_locations!break_fix_tickets_location_id_fkey ( name ),
            assignee:profiles!break_fix_tickets_assigned_to_user_id_fkey ( full_name )
          `)
          .eq("site_id", sid)
          .gte("created_at", `${selectedDate}T00:00:00`)
          .in("status", ["open", "assigned", "in_progress"]),
      ]);

      const workerList: CBWorker[] = [];
      const taskList: CBTask[] = [];

      (assignmentsRes.data || []).forEach((a: any) => {
        const workerTasks = a.assigned_tasks || [];
        const totalPlanned = workerTasks
          .filter((t: any) => !["cancelled", "failed", "missed"].includes(t.status))
          .reduce((s: number, t: any) => s + (t.standard_minutes || 0), 0);

        const shiftStart = a.profiles?.default_shift_start || "07:00:00";
        const shiftEnd = a.profiles?.default_shift_end || "15:00:00";
        const breakMin = a.profiles?.default_break_minutes || 30;
        const [sh, sm] = shiftStart.split(":").map(Number);
        const [eh, em] = shiftEnd.split(":").map(Number);
        const shiftCapacity = (eh * 60 + em) - (sh * 60 + sm) - breakMin;

        workerList.push({
          id: a.staff_user_id,
          full_name: a.profiles?.full_name || "",
          avatar_initials: a.profiles?.avatar_initials || null,
          shift_type: a.shift_type,
          assignment_id: a.id,
          total_planned_minutes: totalPlanned,
          shift_capacity_minutes: shiftCapacity,
        });

        workerTasks.forEach((t: any) => {
          taskList.push({
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
            window_start: t.window_start,
            window_end: t.window_end,
            sequence_order: t.sequence_order,
            is_deferred: t.is_deferred,
            defer_count: t.defer_count || 0,
            staff_user_id: a.staff_user_id,
            checklist_json: t.checklist_json,
          });
        });
      });

      setWorkers(workerList);
      setTasks(taskList);

      const ticketList: CBTicket[] = (ticketsRes.data || []).map((t: any) => ({
        id: t.id,
        description: t.description,
        priority: t.priority,
        status: t.status,
        location_name: t.campus_locations?.name || "",
        location_id: t.location_id,
        assigned_to_user_id: t.assigned_to_user_id,
        assigned_to_name: t.assignee?.full_name || null,
        created_at: t.created_at,
      }));
      setTickets(ticketList);
    } catch (err) {
      console.error("Control board fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("control-board-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "assigned_tasks" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "break_fix_tickets" }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // ── Mutation helpers ──

  const reassignTask = useCallback(async (taskId: string, targetAssignmentId: string, targetWorkerId: string) => {
    if (!user?.id || !siteId) return;

    // Find the target assignment's tasks to determine new sequence order
    const targetTasks = tasks.filter(t => t.assignment_id === targetAssignmentId);
    const maxSeq = targetTasks.length > 0 ? Math.max(...targetTasks.map(t => t.sequence_order)) : 0;

    const { error } = await supabase
      .from("assigned_tasks")
      .update({ assignment_id: targetAssignmentId, sequence_order: maxSeq + 1 })
      .eq("id", taskId);

    if (error) throw error;

    // Log event
    await supabase.from("events_log").insert({
      event_type: "task_reassigned" as any,
      user_id: user.id,
      assigned_task_id: taskId,
      assignment_id: targetAssignmentId,
      site_id: siteId,
      event_payload: { target_worker_id: targetWorkerId },
    });

    await fetchData();
  }, [user?.id, siteId, tasks, fetchData]);

  const changePriority = useCallback(async (taskId: string, newPriority: "normal" | "high") => {
    if (!user?.id || !siteId) return;

    const { error } = await supabase
      .from("assigned_tasks")
      .update({ priority: newPriority })
      .eq("id", taskId);

    if (error) throw error;

    await supabase.from("events_log").insert({
      event_type: "priority_changed" as any,
      user_id: user.id,
      assigned_task_id: taskId,
      site_id: siteId,
      event_payload: { new_priority: newPriority },
    });

    await fetchData();
  }, [user?.id, siteId, fetchData]);

  const deferTaskManager = useCallback(async (taskId: string) => {
    if (!user?.id || !siteId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const { error } = await supabase
      .from("assigned_tasks")
      .update({
        status: "deferred" as any,
        is_deferred: true,
        defer_count: (task.defer_count || 0) + 1,
        deferred_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (error) throw error;

    await supabase.from("events_log").insert({
      event_type: "task_deferred" as any,
      user_id: user.id,
      assigned_task_id: taskId,
      site_id: siteId,
      event_payload: { reason: "manager_override", defer_count: (task.defer_count || 0) + 1 },
    });

    await fetchData();
  }, [user?.id, siteId, tasks, fetchData]);

  const cancelTask = useCallback(async (taskId: string, reason: string) => {
    if (!user?.id || !siteId) return;

    const { error } = await supabase
      .from("assigned_tasks")
      .update({ status: "cancelled" as any })
      .eq("id", taskId);

    if (error) throw error;

    await supabase.from("events_log").insert({
      event_type: "task_cancelled" as any,
      user_id: user.id,
      assigned_task_id: taskId,
      site_id: siteId,
      event_payload: { reason },
    });

    await fetchData();
  }, [user?.id, siteId, fetchData]);

  const duplicateTask = useCallback(async (taskId: string, targetAssignmentId?: string) => {
    if (!user?.id || !siteId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const assignmentId = targetAssignmentId || task.assignment_id;
    const assignmentTasks = tasks.filter(t => t.assignment_id === assignmentId);
    const maxSeq = assignmentTasks.length > 0 ? Math.max(...assignmentTasks.map(t => t.sequence_order)) : 0;

    const { error } = await supabase
      .from("assigned_tasks")
      .insert([{
        assignment_id: assignmentId,
        task_name: task.task_name,
        location_id: task.location_id,
        standard_minutes: task.standard_minutes,
        priority: task.priority as any,
        sequence_order: maxSeq + 1,
        status: "queued" as any,
        checklist_json: task.checklist_json,
      }]);

    if (error) throw error;
    await fetchData();
  }, [user?.id, siteId, tasks, fetchData]);

  return {
    workers, tasks, tickets, loading, refetch: fetchData,
    reassignTask, changePriority, deferTaskManager, cancelTask, duplicateTask,
  };
}
