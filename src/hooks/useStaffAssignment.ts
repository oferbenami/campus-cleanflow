import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Json } from "@/integrations/supabase/types";

const SITE_ID = "37027ccd-c7d7-4d77-988d-6da914e347b4";

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
  status: "queued" | "ready" | "in_progress" | "blocked" | "completed" | "failed" | "deferred" | "paused" | "missed";
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
  location_floor: string | null;
  // parent location breadcrumb
  parent_name: string | null;
  grandparent_name: string | null;
  // defer metadata
  defer_reason?: string;
  deferred_at?: string;
  defer_count: number;
  partial_elapsed_minutes: number;
  is_deferred: boolean;
  queue_order: number | null;
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

      const { data: tasksData, error: tErr } = await supabase
        .from("assigned_tasks")
        .select(`
          id, assignment_id, location_id, task_name, standard_minutes, priority,
          status, checklist_json, sequence_order, window_start, window_end,
          started_at, finished_at, actual_minutes, variance_percent,
          start_tag_uid, finish_tag_uid, is_deferred, defer_reason,
          deferred_at, defer_count, partial_elapsed_minutes, queue_order,
          campus_locations!assigned_tasks_location_id_fkey (
            name, nfc_tag_uid, level_type, space_type, parent_location_id
          )
        `)
        .eq("assignment_id", assignmentData.id)
        .order("sequence_order", { ascending: true });

      if (tErr) throw tErr;

      const locationIds = (tasksData || []).map((t: any) => t.campus_locations?.parent_location_id).filter(Boolean);
      const uniqueParentIds = [...new Set(locationIds)] as string[];
      
      let parentMap: Record<string, { name: string; parent_location_id: string | null; level_type: string | null }> = {};
      if (uniqueParentIds.length > 0) {
        const { data: parents } = await supabase
          .from("campus_locations")
          .select("id, name, parent_location_id, level_type")
          .in("id", uniqueParentIds);
        if (parents) {
          for (const p of parents) parentMap[p.id] = { name: p.name, parent_location_id: p.parent_location_id, level_type: p.level_type };
        }
        const gpIds = Object.values(parentMap).map(p => p.parent_location_id).filter(Boolean) as string[];
        if (gpIds.length > 0) {
          const { data: gps } = await supabase.from("campus_locations").select("id, name, level_type").in("id", [...new Set(gpIds)]);
          if (gps) {
            for (const gp of gps) parentMap[gp.id] = { ...parentMap[gp.id], name: gp.name, parent_location_id: null, level_type: gp.level_type };
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
          location_floor: parent?.level_type === "floor" ? parent?.name : (grandparent?.level_type === "floor" ? grandparent?.name : null),
          parent_name: parent?.name || null,
          grandparent_name: grandparent?.name || null,
          defer_reason: t.defer_reason || undefined,
          deferred_at: t.deferred_at || undefined,
          defer_count: t.defer_count || 0,
          partial_elapsed_minutes: t.partial_elapsed_minutes || 0,
          is_deferred: t.is_deferred || false,
          queue_order: t.queue_order,
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
    const task = tasks.find((t) => t.id === taskId);
    const isResuming = task?.status === "deferred" && task.partial_elapsed_minutes > 0;

    const { error } = await supabase
      .from("assigned_tasks")
      .update({
        status: "in_progress" as any,
        started_at: isResuming ? task.started_at : new Date().toISOString(),
        start_tag_uid: nfcTagUid,
        is_deferred: false,
      })
      .eq("id", taskId);

    if (error) throw error;

    if (user?.id && assignment) {
      await supabase.from("events_log").insert({
        user_id: user.id,
        site_id: SITE_ID,
        assignment_id: assignment.id,
        assigned_task_id: taskId,
        event_type: (isResuming ? "task_resumed" : "task_start") as any,
        event_payload: { nfc_tag_uid: nfcTagUid, resumed: isResuming },
      });
    }

    await fetchData();
  }, [user?.id, assignment, tasks, fetchData]);

  const finishTask = useCallback(async (taskId: string, nfcTagUid: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task?.started_at) return;

    const startedAt = new Date(task.started_at);
    const now = new Date();
    let actualMinutes = Math.round((now.getTime() - startedAt.getTime()) / 60000);
    // If task was deferred and resumed, add partial time
    if (task.partial_elapsed_minutes > 0) {
      actualMinutes = task.partial_elapsed_minutes + Math.round((now.getTime() - startedAt.getTime()) / 60000);
    }
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
        is_deferred: false,
      })
      .eq("id", taskId);

    if (error) throw error;

    if (user?.id && assignment) {
      await supabase.from("events_log").insert({
        user_id: user.id,
        site_id: SITE_ID,
        assignment_id: assignment.id,
        assigned_task_id: taskId,
        event_type: "task_finish" as any,
        event_payload: { nfc_tag_uid: nfcTagUid, actual_minutes: actualMinutes, variance_percent: variancePercent },
      });
    }

    const remaining = tasks.filter((t) => t.id !== taskId && !["completed", "failed", "missed"].includes(t.status));
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

  /** Skip task with "failed" status (legacy) */
  const skipTask = useCallback(async (taskId: string, reason: string) => {
    const { error } = await supabase
      .from("assigned_tasks")
      .update({ status: "failed" as any })
      .eq("id", taskId);

    if (error) throw error;

    if (user?.id && assignment) {
      await supabase.from("events_log").insert({
        user_id: user.id,
        site_id: SITE_ID,
        assignment_id: assignment.id,
        assigned_task_id: taskId,
        event_type: "sla_alert" as any,
        event_payload: { reason, action: "cannot_perform" },
      });
    }

    await fetchData();
  }, [user?.id, assignment, fetchData]);

  /** Controlled Defer / Pause with full audit trail */
  const deferTask = useCallback(async (
    taskId: string,
    reasonCode: string,
    reasonLabel: string,
    note: string,
    action: "defer_swap" | "defer_end"
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Calculate partial elapsed time if task was in_progress
    let partialMinutes = task.partial_elapsed_minutes || 0;
    if (task.status === "in_progress" && task.started_at) {
      const elapsed = Math.round((Date.now() - new Date(task.started_at).getTime()) / 60000);
      partialMinutes += elapsed;
    }

    const newDeferCount = (task.defer_count || 0) + 1;
    const isCritical = task.location_space_type === "restroom" || task.location_space_type === "lobby" || task.priority === "high";

    // Update task to deferred status
    const { error: updateErr } = await supabase
      .from("assigned_tasks")
      .update({
        status: "deferred" as any,
        is_deferred: true,
        defer_reason: reasonLabel,
        deferred_at: new Date().toISOString(),
        defer_count: newDeferCount,
        partial_elapsed_minutes: partialMinutes,
        started_at: null, // Reset started_at for when it resumes
      })
      .eq("id", taskId);
    if (updateErr) throw updateErr;

    // Log defer event
    if (user?.id && assignment) {
      await supabase.from("events_log").insert({
        user_id: user.id,
        site_id: SITE_ID,
        assignment_id: assignment.id,
        assigned_task_id: taskId,
        event_type: "task_deferred" as any,
        event_payload: {
          action: "cannot_perform",
          reason: reasonLabel,
          reason_code: reasonCode,
          note: note || undefined,
          defer_action: action,
          defer_count: newDeferCount,
          partial_elapsed_minutes: partialMinutes,
          task_name: task.task_name,
          location: task.location_name,
          is_critical: isCritical,
          is_escalation: newDeferCount >= 2,
        },
      });
    }

    if (action === "defer_swap") {
      // Swap with next task
      const currentIdx = tasks.findIndex((t) => t.id === taskId);
      const nextQueued = tasks.find((t, i) => i > currentIdx && ["queued", "ready"].includes(t.status));
      
      if (nextQueued) {
        await supabase
          .from("assigned_tasks")
          .update({ sequence_order: nextQueued.sequence_order } as any)
          .eq("id", taskId);
        await supabase
          .from("assigned_tasks")
          .update({ sequence_order: task.sequence_order } as any)
          .eq("id", nextQueued.id);
      }
    } else {
      // Move to end
      const maxOrder = Math.max(...tasks.map((t) => t.sequence_order));
      await supabase
        .from("assigned_tasks")
        .update({ sequence_order: maxOrder + 1 } as any)
        .eq("id", taskId);
    }

    await fetchData();
  }, [user?.id, assignment, tasks, fetchData]);

  /** Legacy cannot perform (kept for backward compat) */
  const cannotPerformTask = useCallback(async (
    taskId: string,
    reason: string,
    note: string,
    action: "defer_swap" | "defer_end" | "block"
  ) => {
    // Route through new defer logic
    if (action === "block") {
      await deferTask(taskId, reason, reason, note, "defer_end");
    } else {
      await deferTask(taskId, reason, reason, note, action);
    }
  }, [deferTask]);

  /** Send SLA alert event to supervisor dashboard */
  const sendSlaAlert = useCallback(async (taskId: string, elapsedMinutes: number) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !user?.id || !assignment) return;

    await supabase.from("events_log").insert({
      user_id: user.id,
      site_id: SITE_ID,
      assignment_id: assignment.id,
      assigned_task_id: taskId,
      event_type: "sla_alert" as any,
      event_payload: {
        action: "overrun_alert",
        task_name: task.task_name,
        location: task.location_name,
        elapsed_minutes: elapsedMinutes,
        standard_minutes: task.standard_minutes,
        variance_percent: Math.round(((elapsedMinutes - task.standard_minutes) / task.standard_minutes) * 100),
      },
    });
  }, [user?.id, assignment, tasks]);

  return {
    assignment,
    tasks,
    loading,
    error,
    startTask,
    finishTask,
    updateChecklist,
    skipTask,
    cannotPerformTask,
    deferTask,
    sendSlaAlert,
    refetch: fetchData,
  };
}
