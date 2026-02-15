// Scheduled times for staff assignments (mock data enrichment)
// Maps assignment ID to planned start time
export const scheduledTimes: Record<string, { plannedStart: string; plannedEnd: string }> = {
  a1: { plannedStart: "07:00", plannedEnd: "07:20" },
  a2: { plannedStart: "07:25", plannedEnd: "07:40" },
  a3: { plannedStart: "07:45", plannedEnd: "07:55" },
};

export function getPlannedMinutesUpToNow(
  assignments: { id: string; task: { estimatedMinutes: number } }[],
  nowHour: number,
  nowMinute: number
): { shouldBeCompleted: number; totalPlanned: number } {
  let shouldBeCompleted = 0;
  let totalPlanned = 0;

  for (const a of assignments) {
    const sched = scheduledTimes[a.id];
    if (!sched) continue;
    totalPlanned += a.task.estimatedMinutes;

    const [endH, endM] = sched.plannedEnd.split(":").map(Number);
    const endTotal = endH * 60 + endM;
    const nowTotal = nowHour * 60 + nowMinute;

    if (nowTotal >= endTotal) {
      shouldBeCompleted += a.task.estimatedMinutes;
    }
  }

  return { shouldBeCompleted, totalPlanned };
}
