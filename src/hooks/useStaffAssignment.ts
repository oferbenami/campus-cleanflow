import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Json } from "@/integrations/supabase/types";

export interface ChecklistItem {
  item: string;
  done: boolean;
}

export interface AssignedTaskRow {
  id: string;
  assignment_id: string;
  location_id: string;
  task_name: string;
  standard_minutes: number;
  priority: "normal" | "high";
  status: "queued" | "ready" | "in_progress" | "blocked" | "completed" | "failed";
  checklist_json: ChecklistItem[];
  sequence_order: number;
  window_start: string | null;
  window_end: string | null;
  started_at: string | null;
  finished_at: string | null;
  actual_minutes: number | null;
  variance_percent: number | null;
  start_tag_uid: string | null;
  finish_tag_uid: string | null;
  // joined location data
  location_name: string;
  location_nfc_tag_uid: string | null;
  location_level_type: string;
  location_space_type: string | null;
  // parent location breadcrumb
  parent_name: string | null;
  grandparent_name: string | null;
}

export interface AssignmentInfo {
  id: string;
  date: string;
  shift_type: "morning" | "evening";
  status: string;
  staff_name: string;
}

function parseChecklist(json: Json | null): ChecklistItem[] {
  if (!json || !Array.isArray(json)) return [];
  return (json as { item: string; done: boolean }[]).map((c) => ({
    item: c.item ?? "",
    done: !!c.done,
  }));
}

export function useStaffAssignment() {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<AssignmentInfo | null>(null);
  const [tasks, setTasks] = useState<AssignedTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    try {
      // Get today's active assignment
      const today = new Date().toISOString().split("T")[0];
      const { data: assignmentData, error: aErr } = await supabase
        .from("assignments")
        .select("id, date, shift_type, status, staff_user_id")
        .eq("staff_user_id", user.id)
        .eq("date", today)
        .in("status", ["planned", "active"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (aErr) throw aErr;
      if (!assignmentData) {
        setAssignment(null);
        setTasks([]);
        setLoading(false);
        return;
      }

      // Get staff name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      setAssignment({
        id: assignmentData.id,
        date: assignmentData.date,
        shift_type: assignmentData.shift_type as "morning" | "evening",
        status: assignmentData.status,
        staff_name: profile?.full_name || "",
      });

      // Get assigned tasks with location data
      const { data: tasksData, error: tErr } = await supabase
        .from("assigned_tasks")
        .select(`
          id, assignment_id, location_id, task_name, standard_minutes, priority,
          status, checklist_json, sequence_order, window_start, window_end,
          started_at, finished_at, actual_minutes, variance_percent,
          start_tag_uid, finish_tag_uid,
          campus_locations!assigned_tasks_location_id_fkey (
            name, nfc_tag_uid, level_type, space_type, parent_location_id
          )
        `)
        .eq("assignment_id", assignmentData.id)
        .order("sequence_order", { ascending: true });

      if (tErr) throw tErr;

      // Get parent location names in a second query
      const locationIds = (tasksData || []).map((t: any) => t.campus_locations?.parent_location_id).filter(Boolean);
      const uniqueParentIds = [...new Set(locationIds)] as string[];
      
      let parentMap: Record<string, { name: string; parent_location_id: string | null }> = {};
      if (uniqueParentIds.length > 0) {
        const { data: parents } = await supabase
          .from("campus_locations")
          .select("id, name, parent_location_id")
          .in("id", uniqueParentIds);
        if (parents) {
          for (const p of parents) parentMap[p.id] = { name: p.name, parent_location_id: p.parent_location_id };
        }
        // Get grandparents
        const gpIds = Object.values(parentMap).map(p => p.parent_location_id).filter(Boolean) as string[];
        if (gpIds.length > 0) {
          const { data: gps } = await supabase.from("campus_locations").select("id, name").in("id", [...new Set(gpIds)]);
          if (gps) {
            for (const gp of gps) parentMap[gp.id] = { ...parentMap[gp.id], name: gp.name, parent_location_id: null };
          }
        }
      }

      const mapped: AssignedTaskRow[] = (tasksData || []).map((t: any) => {
        const loc = t.campus_locations;
        const parentId = loc?.parent_location_id;
        const parent = parentId ? parentMap[parentId] : null;
        const grandparent = parent?.parent_location_id ? parentMap[parent.parent_location_id] : null;
        return {
          id: t.id,
          assignment_id: t.assignment_id,
          location_id: t.location_id,
          task_name: t.task_name,
          standard_minutes: t.standard_minutes,
          priority: t.priority,
          status: t.status,
          checklist_json: parseChecklist(t.checklist_json),
          sequence_order: t.sequence_order,
          window_start: t.window_start,
          window_end: t.window_end,
          started_at: t.started_at,
          finished_at: t.finished_at,
          actual_minutes: t.actual_minutes,
          variance_percent: t.variance_percent,
          start_tag_uid: t.start_tag_uid,
          finish_tag_uid: t.finish_tag_uid,
          location_name: loc?.name || "",
          location_nfc_tag_uid: loc?.nfc_tag_uid || null,
          location_level_type: loc?.level_type || "",
          location_space_type: loc?.space_type || null,
          parent_name: parent?.name || null,
          grandparent_name: grandparent?.name || null,
        };
      });

      setTasks(mapped);
    } catch (err: any) {
      setError(err.message || "שגיאה בטעינת נתונים");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Task Actions ──

  const startTask = useCallback(async (taskId: string, nfcTagUid: string) => {
    const { error } = await supabase
      .from("assigned_tasks")
      .update({
        status: "in_progress" as any,
        started_at: new Date().toISOString(),
        start_tag_uid: nfcTagUid,
      })
      .eq("id", taskId);

    if (error) throw error;

    // Log event
    if (user?.id && assignment) {
      await supabase.from("events_log").insert({
        user_id: user.id,
        site_id: "37027ccd-c7d7-4d77-988d-6da914e347b4",
        assignment_id: assignment.id,
        assigned_task_id: taskId,
        event_type: "task_start" as any,
        event_payload: { nfc_tag_uid: nfcTagUid },
      });
    }

    await fetchData();
  }, [user?.id, assignment, fetchData]);

  const finishTask = useCallback(async (taskId: string, nfcTagUid: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task?.started_at) return;

    const startedAt = new Date(task.started_at);
    const now = new Date();
    const actualMinutes = Math.round((now.getTime() - startedAt.getTime()) / 60000);
    const variancePercent = task.standard_minutes > 0
      ? Math.round(((actualMinutes - task.standard_minutes) / task.standard_minutes) * 100)
      : 0;

    const { error } = await supabase
      .from("assigned_tasks")
      .update({
        status: "completed" as any,
        finished_at: now.toISOString(),
        finish_tag_uid: nfcTagUid,
        actual_minutes: actualMinutes,
        variance_percent: variancePercent,
      })
      .eq("id", taskId);

    if (error) throw error;

    // Log event
    if (user?.id && assignment) {
      await supabase.from("events_log").insert({
        user_id: user.id,
        site_id: "37027ccd-c7d7-4d77-988d-6da914e347b4",
        assignment_id: assignment.id,
        assigned_task_id: taskId,
        event_type: "task_finish" as any,
        event_payload: { nfc_tag_uid: nfcTagUid, actual_minutes: actualMinutes, variance_percent: variancePercent },
      });
    }

    // Check if all tasks completed -> mark assignment complete
    const remaining = tasks.filter((t) => t.id !== taskId && t.status !== "completed");
    if (remaining.length === 0 && assignment) {
      await supabase
        .from("assignments")
        .update({ status: "completed" as any })
        .eq("id", assignment.id);
    }

    await fetchData();
  }, [user?.id, assignment, tasks, fetchData]);

  const updateChecklist = useCallback(async (taskId: string, checklist: ChecklistItem[]) => {
    await supabase
      .from("assigned_tasks")
      .update({ checklist_json: checklist as any })
      .eq("id", taskId);
    
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, checklist_json: checklist } : t))
    );
  }, []);

  const skipTask = useCallback(async (taskId: string, reason: string) => {
    const { error } = await supabase
      .from("assigned_tasks")
      .update({ status: "failed" as any })
      .eq("id", taskId);

    if (error) throw error;

    if (user?.id && assignment) {
      await supabase.from("events_log").insert({
        user_id: user.id,
        site_id: "37027ccd-c7d7-4d77-988d-6da914e347b4",
        assignment_id: assignment.id,
        assigned_task_id: taskId,
        event_type: "sla_alert" as any,
        event_payload: { reason, action: "cannot_perform" },
      });
    }

    await fetchData();
  }, [user?.id, assignment, fetchData]);

  return {
    assignment,
    tasks,
    loading,
    error,
    startTask,
    finishTask,
    updateChecklist,
    skipTask,
    refetch: fetchData,
  };
}
