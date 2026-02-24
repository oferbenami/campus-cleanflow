import { supabase } from "@/integrations/supabase/client";

/**
 * Generate assigned_tasks for a BASE template + optional ADD-ON templates.
 * Handles merge logic: if same location+task_name exists, pick higher priority.
 */
export async function generateAssignmentTasks(
  assignmentId: string,
  baseTemplateId: string,
  addonTemplateIds: string[],
  date: string,
  shiftType: "morning" | "evening"
) {
  const weekday = new Date(date).getDay(); // 0=Sun
  const shiftStart = shiftType === "morning" ? "07:00" : "16:00";

  // Fetch BASE tasks
  const { data: baseTasks } = await supabase
    .from("template_tasks")
    .select("*")
    .eq("template_id", baseTemplateId);

  // Filter by weekday
  const filteredBase = (baseTasks || []).filter((t) => {
    const days = (t as any).days_of_week as number[] | null;
    return !days || days.includes(weekday);
  });

  // Fetch ADD-ON tasks
  let addonTasks: any[] = [];
  if (addonTemplateIds.length) {
    const { data } = await supabase
      .from("template_tasks")
      .select("*")
      .in("template_id", addonTemplateIds);
    addonTasks = (data || []).filter((t) => {
      const days = (t as any).days_of_week as number[] | null;
      return !days || days.includes(weekday);
    });
  }

  // Build merged task list (key = location_id + task_name)
  const priorityRank: Record<string, number> = { high: 2, normal: 1 };
  const taskMap = new Map<string, any>();

  // Add BASE tasks
  for (const t of filteredBase) {
    const key = `${t.location_id}::${t.task_name}`;
    taskMap.set(key, { ...t, source_template_id: baseTemplateId, source_type: "base" });
  }

  // Merge ADD-ON tasks
  for (const t of addonTasks) {
    const key = `${t.location_id}::${t.task_name}`;
    const existing = taskMap.get(key);
    if (existing) {
      // Merge: keep higher priority
      const existingRank = priorityRank[existing.priority] || 0;
      const newRank = priorityRank[t.priority] || 0;
      if (newRank > existingRank) {
        existing.priority = t.priority;
      }
      // Could merge checklists here in the future
    } else {
      taskMap.set(key, { ...t, source_template_id: t.template_id, source_type: "addon" });
    }
  }

  // Sort: priority desc, then by original order
  const sortedTasks = Array.from(taskMap.values()).sort((a, b) => {
    const pa = priorityRank[a.priority] || 0;
    const pb = priorityRank[b.priority] || 0;
    if (pb !== pa) return pb - pa;
    return 0;
  });

  // Generate time windows
  let cursor = shiftStart;
  const assignedTasks = sortedTasks.map((t, i) => {
    const startDate = new Date(`${date}T${cursor}:00`);
    const endDate = new Date(startDate.getTime() + t.standard_minutes * 60000);
    cursor = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;

    return {
      assignment_id: assignmentId,
      task_name: t.task_name,
      location_id: t.location_id,
      standard_minutes: t.standard_minutes,
      priority: t.priority,
      checklist_json: t.checklist_json,
      sequence_order: i + 1,
      queue_order: i + 1,
      window_start: startDate.toISOString(),
      window_end: endDate.toISOString(),
      status: "queued" as const,
      source_template_id: t.source_template_id,
      source_type: t.source_type,
    };
  });

  if (assignedTasks.length) {
    const { error } = await supabase.from("assigned_tasks").insert(assignedTasks);
    if (error) throw error;
  }

  return assignedTasks;
}

/**
 * Calculate capacity summary for a BASE + ADD-ONs combination.
 */
export function calculateCapacity(
  baseTasks: { standard_minutes: number; days_of_week?: number[] }[],
  addonTasks: { standard_minutes: number; days_of_week?: number[] }[],
  weekday: number,
  shiftMinutes: number = 420 // 7 hours default
) {
  const filterByDay = (tasks: typeof baseTasks) =>
    tasks.filter((t) => !t.days_of_week || t.days_of_week.includes(weekday));

  const baseFiltered = filterByDay(baseTasks);
  const addonFiltered = filterByDay(addonTasks);

  const baseMinutes = baseFiltered.reduce((s, t) => s + t.standard_minutes, 0);
  const addonMinutes = addonFiltered.reduce((s, t) => s + t.standard_minutes, 0);
  const totalMinutes = baseMinutes + addonMinutes;
  const utilizationPercent = Math.round((totalMinutes / shiftMinutes) * 100);

  return {
    baseMinutes,
    addonMinutes,
    totalMinutes,
    shiftMinutes,
    utilizationPercent,
    status: utilizationPercent <= 60 ? "under" as const
      : utilizationPercent <= 100 ? "balanced" as const
      : "over" as const,
    baseTaskCount: baseFiltered.length,
    addonTaskCount: addonFiltered.length,
  };
}
