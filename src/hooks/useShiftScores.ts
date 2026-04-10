import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SITE_ID } from "@/hooks/usePropertyManagerData";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface ShiftScoreData {
  id: string;
  site_id: string;
  date: string;
  shift_type: string;
  shift_score: number;
  site_score: number;
  previous_site_score: number;
  tasks_assigned: number;
  tasks_completed: number;
  tasks_missed: number;
  extra_tasks_completed: number;
  sla_breaches: number;
  executive_failures: number;
  cleaning_actions_completed: boolean;
  score_breakdown_json: any;
  created_at: string;
}

/* ─── Fetch scores for a date ─── */
export function useShiftScore(date: string, shiftType?: string) {
  return useQuery({
    queryKey: ["shift-scores", date, shiftType],
    queryFn: async () => {
      let query = supabase
        .from("shift_scores")
        .select("*")
        .eq("site_id", SITE_ID)
        .eq("date", date);
      if (shiftType) query = query.eq("shift_type", shiftType);
      query = query.order("created_at", { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ShiftScoreData[];
    },
  });
}

/* ─── Fetch latest site score ─── */
export function useLatestSiteScore() {
  return useQuery({
    queryKey: ["latest-site-score"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_scores")
        .select("site_score, date, shift_type, shift_score")
        .eq("site_id", SITE_ID)
        .order("date", { ascending: false })
        .order("shift_type", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { site_score: number; date: string; shift_type: string; shift_score: number } | null;
    },
  });
}

/* ─── Score trend (last N shifts) ─── */
export function useScoreTrend(days = 14) {
  return useQuery({
    queryKey: ["score-trend", days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from("shift_scores")
        .select("date, shift_type, shift_score, site_score")
        .eq("site_id", SITE_ID)
        .gte("date", since.toISOString().split("T")[0])
        .order("date", { ascending: true })
        .order("shift_type", { ascending: true });
      if (error) throw error;
      return (data || []) as { date: string; shift_type: string; shift_score: number; site_score: number }[];
    },
  });
}

/* ─── Compute and save shift score ─── */
export function useComputeShiftScore() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { date: string; shiftType: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // 1. Get assignments for this shift
      const { data: assignments } = await supabase
        .from("assignments")
        .select("id")
        .eq("site_id", SITE_ID)
        .eq("date", params.date)
        .eq("shift_type", params.shiftType as "morning" | "evening");

      if (!assignments?.length) throw new Error("No assignments found");

      const assignmentIds = assignments.map((a) => a.id);

      // 2. Get tasks
      const { data: tasks } = await supabase
        .from("assigned_tasks")
        .select("id, status, standard_minutes, actual_minutes, variance_percent, source_type")
        .in("assignment_id", assignmentIds);

      const allTasks = tasks || [];
      const tasksAssigned = allTasks.length;
      const tasksCompleted = allTasks.filter((t) => t.status === "completed").length;
      const tasksMissed = allTasks.filter((t) => t.status === "missed" || t.status === "failed" || t.status === "cancelled").length;
      const extraTasks = 0; // Could be extended to track ad-hoc tasks
      const slaBreaches = allTasks.filter((t) => (t.variance_percent || 0) > 15).length;

      // 3. Check executive area failures
      const { data: execChecks } = await supabase
        .from("executive_area_checks")
        .select("status")
        .eq("site_id", SITE_ID)
        .eq("date", params.date);
      const executiveFailures = (execChecks || []).filter((c) => c.status !== "ok").length;

      // 4. Check cleaning actions completed
      const { data: checklist } = await supabase
        .from("site_readiness_checklists")
        .select("cleaning_actions_json")
        .eq("site_id", SITE_ID)
        .eq("date", params.date)
        .eq("shift_type", params.shiftType)
        .maybeSingle();

      let cleaningActionsCompleted = false;
      if (checklist?.cleaning_actions_json) {
        const actions = checklist.cleaning_actions_json as any[];
        cleaningActionsCompleted = actions.every((a: any) => a.status === "ok");
      }

      // 5. Compute shift score
      const baseScore = tasksAssigned > 0 ? (tasksCompleted / tasksAssigned) * 100 : 0;
      const bonus = tasksAssigned > 0 ? (extraTasks / tasksAssigned) * 20 : 0;
      const penalty = (tasksMissed * 5) + (slaBreaches * 3) + (executiveFailures * 10);
      const rawShiftScore = baseScore + bonus - penalty;
      const shiftScore = Math.max(0, Math.min(120, Math.round(rawShiftScore * 10) / 10));

      // 6. Get previous site score
      const { data: prevScore } = await supabase
        .from("shift_scores")
        .select("site_score")
        .eq("site_id", SITE_ID)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const previousSiteScore = prevScore?.site_score ?? 80;

      // 7. Compute new site score with improvement rule
      let newSiteScore: number;
      const canImprove = shiftScore > 100 && cleaningActionsCompleted;
      const rawNewScore = (Number(previousSiteScore) * 0.7) + (shiftScore * 0.3);

      if (canImprove) {
        newSiteScore = rawNewScore;
      } else {
        // Can only maintain or decrease
        newSiteScore = Math.min(Number(previousSiteScore), rawNewScore);
      }

      // Executive area impact: additional penalty
      if (executiveFailures > 0) {
        newSiteScore -= executiveFailures * 2;
      }

      newSiteScore = Math.max(0, Math.min(120, Math.round(newSiteScore * 10) / 10));

      // 8. Save
      const { error } = await supabase
        .from("shift_scores")
        .upsert({
          site_id: SITE_ID,
          date: params.date,
          shift_type: params.shiftType,
          shift_score: shiftScore,
          site_score: newSiteScore,
          previous_site_score: previousSiteScore,
          tasks_assigned: tasksAssigned,
          tasks_completed: tasksCompleted,
          tasks_missed: tasksMissed,
          extra_tasks_completed: extraTasks,
          sla_breaches: slaBreaches,
          executive_failures: executiveFailures,
          cleaning_actions_completed: cleaningActionsCompleted,
          computed_by: user.id,
          score_breakdown_json: {
            base_score: Math.round(baseScore * 10) / 10,
            bonus: Math.round(bonus * 10) / 10,
            penalty,
            penalty_detail: {
              missed: tasksMissed * 5,
              sla: slaBreaches * 3,
              executive: executiveFailures * 10,
            },
            can_improve: canImprove,
          },
        } as any, { onConflict: "site_id,date,shift_type" });

      if (error) throw error;

      return { shiftScore, siteScore: newSiteScore, previousSiteScore };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["shift-scores"] });
      qc.invalidateQueries({ queryKey: ["latest-site-score"] });
      qc.invalidateQueries({ queryKey: ["score-trend"] });
      toast.success(`ציון משמרת: ${result.shiftScore} | ציון אתר: ${result.siteScore}`);
    },
    onError: (err: any) => {
      toast.error("שגיאה בחישוב ציון: " + err.message);
    },
  });
}
