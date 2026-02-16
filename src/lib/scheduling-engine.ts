/**
 * CleanFlow Scheduling & Optimization Engine
 * 
 * Deterministic, rule-based industrial engineering logic.
 * No ML — just measurable workload, predictable capacity, controlled deviations.
 */

import type { TaskAssignment, StaffMember, TaskTemplate, Zone } from "@/data/mockData";

/* ═══════════════════════════════════════════
   1. CALCULATED TIME STANDARD
   ═══════════════════════════════════════════ */

/** Base time per space category (minutes) */
const BASE_TIME: Record<string, number> = {
  general: 15,
  office: 10,
  restroom: 15,
  lobby: 12,
  laboratory: 25,
  kitchen: 20,
  meeting_room: 8,
  server_room: 15,
};

/** Traffic level multiplier */
const TRAFFIC_FACTOR: Record<string, number> = {
  low: 0.8,
  medium: 1.0,
  high: 1.3,
  very_high: 1.6,
};

/** Space complexity factor based on logistics fields */
export interface SpaceProfile {
  spaceCategory: string;
  trafficLevel: string;
  areaSqm?: number;
  floorType?: string;
  hasGlass?: boolean;
  hasActiveKitchen?: boolean;
}

export function calculateTimeStandard(profile: SpaceProfile): number {
  const base = BASE_TIME[profile.spaceCategory] || BASE_TIME.general;
  const traffic = TRAFFIC_FACTOR[profile.trafficLevel] || 1.0;

  // Complexity factor
  let complexity = 1.0;

  // Area scaling: every 50 m² above 50 adds 10%
  if (profile.areaSqm && profile.areaSqm > 50) {
    complexity += Math.floor((profile.areaSqm - 50) / 50) * 0.1;
  }

  // Floor type adjustments
  if (profile.floorType === "carpet") complexity += 0.15;
  if (profile.floorType === "mixed") complexity += 0.1;

  // Special features
  if (profile.hasGlass) complexity += 0.1;
  if (profile.hasActiveKitchen) complexity += 0.2;

  const calculated = Math.round(base * traffic * complexity);
  return Math.max(calculated, 5); // minimum 5 minutes
}

export interface TimeStandardResult {
  calculatedMinutes: number;
  baseMinutes: number;
  trafficFactor: number;
  complexityFactor: number;
  isOverridden: boolean;
  overrideMinutes?: number;
}

export function getTimeStandardBreakdown(profile: SpaceProfile, overrideMinutes?: number): TimeStandardResult {
  const base = BASE_TIME[profile.spaceCategory] || BASE_TIME.general;
  const traffic = TRAFFIC_FACTOR[profile.trafficLevel] || 1.0;

  let complexity = 1.0;
  if (profile.areaSqm && profile.areaSqm > 50) {
    complexity += Math.floor((profile.areaSqm - 50) / 50) * 0.1;
  }
  if (profile.floorType === "carpet") complexity += 0.15;
  if (profile.floorType === "mixed") complexity += 0.1;
  if (profile.hasGlass) complexity += 0.1;
  if (profile.hasActiveKitchen) complexity += 0.2;

  const calculated = Math.max(Math.round(base * traffic * complexity), 5);

  return {
    calculatedMinutes: overrideMinutes ?? calculated,
    baseMinutes: base,
    trafficFactor: traffic,
    complexityFactor: complexity,
    isOverridden: overrideMinutes !== undefined && overrideMinutes !== calculated,
    overrideMinutes,
  };
}

/* ═══════════════════════════════════════════
   2. SHIFT CAPACITY & WORKLOAD
   ═══════════════════════════════════════════ */

export interface ShiftConfig {
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  breakMinutes: number;
}

export function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function formatTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function getAvailableMinutes(shift: ShiftConfig): number {
  const start = parseTime(shift.startTime);
  const end = parseTime(shift.endTime);
  return end - start - shift.breakMinutes;
}

export interface WorkerWorkload {
  staffId: string;
  staffName: string;
  totalPlannedMinutes: number;
  availableMinutes: number;
  utilizationPercent: number;
  isOverCapacity: boolean;
  excessMinutes: number;
  taskCount: number;
}

export function calculateWorkerWorkload(
  staffId: string,
  staffName: string,
  taskDurations: number[],
  shift: ShiftConfig
): WorkerWorkload {
  const available = getAvailableMinutes(shift);
  const total = taskDurations.reduce((s, d) => s + d, 0);
  const utilization = available > 0 ? Math.round((total / available) * 100) : 0;

  return {
    staffId,
    staffName,
    totalPlannedMinutes: total,
    availableMinutes: available,
    utilizationPercent: utilization,
    isOverCapacity: total > available,
    excessMinutes: Math.max(0, total - available),
    taskCount: taskDurations.length,
  };
}

/** Workload heat level for UI indicator */
export type HeatLevel = "cool" | "warm" | "hot" | "overload";

export function getHeatLevel(utilization: number): HeatLevel {
  if (utilization <= 70) return "cool";
  if (utilization <= 85) return "warm";
  if (utilization <= 100) return "hot";
  return "overload";
}

/* ═══════════════════════════════════════════
   3. SMART SCHEDULING (PROXIMITY-BASED)
   ═══════════════════════════════════════════ */

export interface SchedulableTask {
  id: string;
  name: string;
  zone: Zone;
  estimatedMinutes: number;
  priority: "normal" | "high" | "emergency";
  timeWindowStart?: string; // "HH:MM" or undefined
  timeWindowEnd?: string;
}

/** Calculate proximity score between two zones (lower = closer) */
function proximityScore(a: Zone, b: Zone): number {
  let score = 0;
  if (a.wing !== b.wing) score += 3;    // different wing
  if (a.floor !== b.floor) score += 2;  // different floor
  if (a.id !== b.id) score += 1;        // different zone
  return score;
}

/** Sort tasks to minimize transitions using nearest-neighbor */
export function optimizeTaskOrder(tasks: SchedulableTask[]): SchedulableTask[] {
  if (tasks.length <= 1) return tasks;

  // Separate time-windowed and flexible tasks
  const windowed = tasks.filter((t) => t.timeWindowStart);
  const flexible = tasks.filter((t) => !t.timeWindowStart);

  // Sort windowed by start time
  windowed.sort((a, b) => parseTime(a.timeWindowStart!) - parseTime(b.timeWindowStart!));

  // Sort flexible by priority first, then apply nearest-neighbor
  const priorityWeight: Record<string, number> = { emergency: 0, high: 1, normal: 2 };
  flexible.sort((a, b) => (priorityWeight[a.priority] ?? 2) - (priorityWeight[b.priority] ?? 2));

  // Nearest-neighbor for flexible tasks
  if (flexible.length > 1) {
    const ordered: SchedulableTask[] = [flexible[0]];
    const remaining = flexible.slice(1);

    while (remaining.length > 0) {
      const last = ordered[ordered.length - 1];
      let bestIdx = 0;
      let bestScore = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        // Combine proximity with priority
        const proxScore = proximityScore(last.zone, remaining[i].zone);
        const prioScore = (priorityWeight[remaining[i].priority] ?? 2) * 0.5;
        const total = proxScore + prioScore;
        if (total < bestScore) {
          bestScore = total;
          bestIdx = i;
        }
      }

      ordered.push(remaining.splice(bestIdx, 1)[0]);
    }

    // Merge windowed tasks back at appropriate positions
    return mergeWindowedTasks(ordered, windowed);
  }

  return mergeWindowedTasks(flexible, windowed);
}

function mergeWindowedTasks(
  flexible: SchedulableTask[],
  windowed: SchedulableTask[]
): SchedulableTask[] {
  if (windowed.length === 0) return flexible;
  if (flexible.length === 0) return windowed;

  // Simple merge: insert windowed tasks at calculated positions
  const result = [...flexible];
  for (const wt of windowed) {
    // Find best insertion point
    let bestIdx = result.length;
    const windowStart = parseTime(wt.timeWindowStart!);

    // Track cumulative time to find the right slot
    let cumTime = 0;
    for (let i = 0; i < result.length; i++) {
      if (cumTime >= windowStart - parseTime("07:00")) {
        bestIdx = i;
        break;
      }
      cumTime += result[i].estimatedMinutes + 5; // 5 min transition
    }
    result.splice(bestIdx, 0, wt);
  }

  return result;
}

/** Generate scheduled times for ordered tasks */
export interface ScheduledSlot {
  taskId: string;
  plannedStart: string;
  plannedEnd: string;
  cumulativeMinutes: number;
}

export function generateSchedule(
  tasks: SchedulableTask[],
  shiftStart: string,
  transitionMinutes: number = 5
): ScheduledSlot[] {
  let cursor = parseTime(shiftStart);
  const slots: ScheduledSlot[] = [];
  let cumulative = 0;

  for (const task of tasks) {
    // If task has a time window and we're early, wait
    if (task.timeWindowStart) {
      const windowStart = parseTime(task.timeWindowStart);
      if (cursor < windowStart) cursor = windowStart;
    }

    const start = cursor;
    const end = cursor + task.estimatedMinutes;
    cumulative += task.estimatedMinutes;

    slots.push({
      taskId: task.id,
      plannedStart: formatTime(start),
      plannedEnd: formatTime(end),
      cumulativeMinutes: cumulative,
    });

    cursor = end + transitionMinutes;
  }

  return slots;
}

/* ═══════════════════════════════════════════
   4. EMERGENCY RE-PLANNING
   ═══════════════════════════════════════════ */

export type SlaRiskLevel = "green" | "yellow" | "red";

export interface ImpactAnalysis {
  affectedTaskId: string;
  taskName: string;
  originalStart: string;
  newStart: string;
  delayMinutes: number;
  slaRisk: SlaRiskLevel;
  slaBreachPredicted: boolean;
}

export interface EmergencyImpact {
  emergencyInsertedAt: number; // index in schedule
  totalDelayMinutes: number;
  shiftOverloadMinutes: number;
  affectedTasks: ImpactAnalysis[];
  riskSummary: { green: number; yellow: number; red: number };
}

export function assessSlaRisk(delayMinutes: number, estimatedMinutes: number): SlaRiskLevel {
  if (delayMinutes <= 0) return "green";
  const ratio = delayMinutes / estimatedMinutes;
  if (ratio < 0.15) return "yellow";
  return "red";
}

export function simulateEmergencyInsertion(
  currentSchedule: ScheduledSlot[],
  tasks: SchedulableTask[],
  emergencyDurationMinutes: number,
  insertAfterIndex: number,
  shift: ShiftConfig
): EmergencyImpact {
  const affectedTasks: ImpactAnalysis[] = [];
  let cumulativeDelay = emergencyDurationMinutes + 5; // +5 transition
  let riskSummary = { green: 0, yellow: 0, red: 0 };

  for (let i = insertAfterIndex + 1; i < currentSchedule.length; i++) {
    const slot = currentSchedule[i];
    const task = tasks.find((t) => t.id === slot.taskId);
    const originalStart = parseTime(slot.plannedStart);
    const newStart = originalStart + cumulativeDelay;
    const risk = assessSlaRisk(cumulativeDelay, task?.estimatedMinutes || 30);
    const breachPredicted = risk === "red";

    riskSummary[risk]++;
    affectedTasks.push({
      affectedTaskId: slot.taskId,
      taskName: task?.name || slot.taskId,
      originalStart: slot.plannedStart,
      newStart: formatTime(newStart),
      delayMinutes: cumulativeDelay,
      slaRisk: risk,
      slaBreachPredicted: breachPredicted,
    });
  }

  const lastSlot = currentSchedule[currentSchedule.length - 1];
  const shiftEnd = parseTime(shift.endTime);
  const newEnd = lastSlot ? parseTime(lastSlot.plannedEnd) + cumulativeDelay : 0;
  const overload = Math.max(0, newEnd - shiftEnd);

  return {
    emergencyInsertedAt: insertAfterIndex + 1,
    totalDelayMinutes: cumulativeDelay,
    shiftOverloadMinutes: overload,
    affectedTasks,
    riskSummary,
  };
}

/* ═══════════════════════════════════════════
   5. VARIANCE MEASUREMENT ENGINE
   ═══════════════════════════════════════════ */

export interface TaskVariance {
  taskId: string;
  taskName: string;
  zoneName: string;
  staffId: string;
  staffName: string;
  spaceCategory: string;
  plannedMinutes: number;
  actualMinutes: number;
  varianceMinutes: number;
  variancePercent: number;
  isSignificantDeviation: boolean; // >20%
}

export function calculateVariance(
  taskName: string,
  zoneName: string,
  staffId: string,
  staffName: string,
  spaceCategory: string,
  plannedMinutes: number,
  actualMinutes: number
): TaskVariance {
  const variance = actualMinutes - plannedMinutes;
  const variancePercent = plannedMinutes > 0 ? Math.round((variance / plannedMinutes) * 100) : 0;

  return {
    taskId: "",
    taskName,
    zoneName,
    staffId,
    staffName,
    spaceCategory,
    plannedMinutes,
    actualMinutes,
    varianceMinutes: variance,
    variancePercent,
    isSignificantDeviation: Math.abs(variancePercent) > 20,
  };
}

export interface VarianceSummary {
  avgVariancePercent: number;
  totalTasks: number;
  significantDeviations: number;
  topOverStandard: TaskVariance[];
  topUnderStandard: TaskVariance[];
  byWorker: { staffId: string; staffName: string; avgVariance: number; count: number }[];
  bySpaceType: { category: string; avgVariance: number; count: number }[];
}

export function computeVarianceSummary(variances: TaskVariance[]): VarianceSummary {
  if (variances.length === 0) {
    return {
      avgVariancePercent: 0,
      totalTasks: 0,
      significantDeviations: 0,
      topOverStandard: [],
      topUnderStandard: [],
      byWorker: [],
      bySpaceType: [],
    };
  }

  const avg = Math.round(
    variances.reduce((s, v) => s + v.variancePercent, 0) / variances.length
  );

  const significant = variances.filter((v) => v.isSignificantDeviation);

  const overStandard = [...variances]
    .filter((v) => v.variancePercent > 0)
    .sort((a, b) => b.variancePercent - a.variancePercent)
    .slice(0, 3);

  const underStandard = [...variances]
    .filter((v) => v.variancePercent < -10)
    .sort((a, b) => a.variancePercent - b.variancePercent)
    .slice(0, 3);

  // Group by worker
  const workerMap = new Map<string, { sum: number; count: number; name: string }>();
  for (const v of variances) {
    const entry = workerMap.get(v.staffId) || { sum: 0, count: 0, name: v.staffName };
    entry.sum += v.variancePercent;
    entry.count++;
    workerMap.set(v.staffId, entry);
  }
  const byWorker = [...workerMap.entries()].map(([staffId, e]) => ({
    staffId,
    staffName: e.name,
    avgVariance: Math.round(e.sum / e.count),
    count: e.count,
  }));

  // Group by space type
  const spaceMap = new Map<string, { sum: number; count: number }>();
  for (const v of variances) {
    const entry = spaceMap.get(v.spaceCategory) || { sum: 0, count: 0 };
    entry.sum += v.variancePercent;
    entry.count++;
    spaceMap.set(v.spaceCategory, entry);
  }
  const bySpaceType = [...spaceMap.entries()].map(([category, e]) => ({
    category,
    avgVariance: Math.round(e.sum / e.count),
    count: e.count,
  }));

  return {
    avgVariancePercent: avg,
    totalTasks: variances.length,
    significantDeviations: significant.length,
    topOverStandard: overStandard,
    topUnderStandard: underStandard,
    byWorker,
    bySpaceType,
  };
}

/* ═══════════════════════════════════════════
   6. CONVENIENCE: COMPUTE FROM MOCK DATA
   ═══════════════════════════════════════════ */

export function computeWorkloadsFromAssignments(
  assignments: TaskAssignment[],
  staff: StaffMember[],
  shift: ShiftConfig = { startTime: "07:00", endTime: "15:00", breakMinutes: 30 }
): WorkerWorkload[] {
  const staffOnly = staff.filter((s) => s.role === "staff");
  return staffOnly.map((s) => {
    const tasks = assignments.filter((a) => a.staff.id === s.id);
    const durations = tasks.map((a) => a.task.estimatedMinutes);
    return calculateWorkerWorkload(s.id, s.name, durations, shift);
  });
}

export function computeVariancesFromAssignments(
  assignments: TaskAssignment[]
): TaskVariance[] {
  return assignments
    .filter((a) => a.status === "completed" && a.elapsedMinutes !== undefined)
    .map((a) => calculateVariance(
      a.task.name,
      a.task.zone.name,
      a.staff.id,
      a.staff.name,
      a.task.zone.roomType?.toLowerCase() || "general",
      a.task.estimatedMinutes,
      a.elapsedMinutes!
    ));
}

export function getSlaRiskTasks(
  assignments: TaskAssignment[]
): { assignment: TaskAssignment; risk: SlaRiskLevel; delayMinutes: number }[] {
  return assignments
    .filter((a) => a.status === "in_progress" || a.status === "overdue")
    .map((a) => {
      const elapsed = a.elapsedMinutes || 0;
      const planned = a.task.estimatedMinutes;
      const delay = elapsed - planned;
      return {
        assignment: a,
        risk: assessSlaRisk(delay, planned),
        delayMinutes: Math.max(0, delay),
      };
    })
    .filter((r) => r.risk !== "green")
    .sort((a, b) => b.delayMinutes - a.delayMinutes);
}
