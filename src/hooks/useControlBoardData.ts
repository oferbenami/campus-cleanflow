import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CBWorker {
  id: string;
  full_name: string;
  avatar_initials: string | null;
  shift_type: "morning" | "evening";
  assignment_id: string;
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

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("site_id")
        .eq("id", user.id)
        .single();

      const siteId = profile?.site_id || "37027ccd-c7d7-4d77-988d-6da914e347b4";

      const [assignmentsRes, ticketsRes] = await Promise.all([
        supabase
          .from("assignments")
          .select(`
            id, staff_user_id, shift_type, status,
            profiles!assignments_staff_user_id_fkey ( full_name, avatar_initials ),
            assigned_tasks (
              id, task_name, standard_minutes, actual_minutes, status, priority,
              started_at, finished_at, window_start, window_end, sequence_order, is_deferred, checklist_json, location_id,
              campus_locations!assigned_tasks_location_id_fkey ( name )
            )
          `)
          .eq("date", selectedDate)
          .eq("site_id", siteId),

        supabase
          .from("break_fix_tickets")
          .select(`
            id, description, priority, status, location_id, assigned_to_user_id, created_at,
            campus_locations!break_fix_tickets_location_id_fkey ( name ),
            assignee:profiles!break_fix_tickets_assigned_to_user_id_fkey ( full_name )
          `)
          .eq("site_id", siteId)
          .gte("created_at", `${selectedDate}T00:00:00`)
          .in("status", ["open", "assigned", "in_progress"]),
      ]);

      const workerList: CBWorker[] = [];
      const taskList: CBTask[] = [];

      (assignmentsRes.data || []).forEach((a: any) => {
        workerList.push({
          id: a.staff_user_id,
          full_name: a.profiles?.full_name || "",
          avatar_initials: a.profiles?.avatar_initials || null,
          shift_type: a.shift_type,
          assignment_id: a.id,
        });

        (a.assigned_tasks || []).forEach((t: any) => {
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

  return { workers, tasks, tickets, loading, refetch: fetchData };
}
