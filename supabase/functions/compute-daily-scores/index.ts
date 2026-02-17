import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { worker_id, score_date } = await req.json();
    const targetDate = score_date || new Date().toISOString().split("T")[0];

    // Get config
    const { data: configs } = await supabase
      .from("incentive_config")
      .select("*")
      .eq("is_active", true)
      .limit(1);
    const config = configs?.[0] || {
      points_on_standard: 50, points_tier1: 40, points_tier2: 25, points_tier3: 0,
      variance_tier1: 110, variance_tier2: 120,
      quality_band_high: 30, quality_band_mid: 20, quality_band_low: 10, quality_band_fail: 0,
      discipline_full: 20, late_threshold_minutes: 10, no_audit_policy: "rolling_average",
    };

    // Get worker's task assignments for the date
    const { data: assignments } = await supabase
      .from("task_assignments")
      .select("*, task_templates(*)")
      .eq("staff_id", worker_id)
      .eq("assignment_date", targetDate);

    if (!assignments || assignments.length === 0) {
      return new Response(JSON.stringify({ message: "No assignments found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // A) Productivity
    const completedTasks = assignments.filter((a: any) => a.status === "completed");
    const plannedMinutes = completedTasks.reduce((s: number, a: any) => s + (a.task_templates?.estimated_minutes || 0), 0);
    const actualMinutes = completedTasks.reduce((s: number, a: any) => s + (a.elapsed_minutes || 0), 0);
    const variancePercent = plannedMinutes > 0 ? (actualMinutes / plannedMinutes) * 100 : 100;

    let productivityPoints = config.points_tier3;
    if (variancePercent <= 100) productivityPoints = config.points_on_standard;
    else if (variancePercent <= config.variance_tier1) productivityPoints = config.points_tier1;
    else if (variancePercent <= config.variance_tier2) productivityPoints = config.points_tier2;

    // B) Quality
    const { data: audits } = await supabase
      .from("quality_audits")
      .select("*")
      .in("task_assignment_id", assignments.map((a: any) => a.id));

    let auditAvg: number | null = null;
    let qualityPoints = 0;

    if (audits && audits.length > 0) {
      const scores = audits.map((a: any) =>
        (a.rating_cleanliness + a.rating_thoroughness + a.rating_timeliness + a.rating_safety + a.rating_supplies) / 5
      );
      auditAvg = scores.reduce((s: number, v: number) => s + v, 0) / scores.length;
    } else if (config.no_audit_policy === "rolling_average") {
      // Use last 30 days rolling average
      const { data: recentScores } = await supabase
        .from("daily_worker_scores")
        .select("audit_avg_score_used")
        .eq("worker_id", worker_id)
        .not("audit_avg_score_used", "is", null)
        .order("score_date", { ascending: false })
        .limit(30);
      if (recentScores && recentScores.length > 0) {
        auditAvg = recentScores.reduce((s: number, r: any) => s + Number(r.audit_avg_score_used), 0) / recentScores.length;
      }
    }

    if (auditAvg !== null) {
      if (auditAvg >= 4.5) qualityPoints = config.quality_band_high;
      else if (auditAvg >= 4.0) qualityPoints = config.quality_band_mid;
      else if (auditAvg >= 3.5) qualityPoints = config.quality_band_low;
      else qualityPoints = config.quality_band_fail;
    }

    // C) Discipline
    const disciplineFlags = { late_start: false, cancel: false, reopen: false };

    // Check late start: first task started_at vs assignment shift start (07:00 + threshold)
    const sortedBySeq = [...assignments].sort((a: any, b: any) => a.sequence_order - b.sequence_order);
    const firstTask = sortedBySeq[0];
    if (firstTask?.started_at) {
      const startedAt = new Date(firstTask.started_at);
      const shiftStart = new Date(targetDate + "T07:00:00");
      const diffMinutes = (startedAt.getTime() - shiftStart.getTime()) / 60000;
      if (diffMinutes > config.late_threshold_minutes) {
        disciplineFlags.late_start = true;
      }
    }

    // Check cancelled tasks
    const cancelledCount = assignments.filter((a: any) => a.status === "cancelled").length;
    if (cancelledCount > 0) disciplineFlags.cancel = true;

    // Check reopened events
    const locationIds = assignments
      .map((a: any) => a.task_templates?.location_id)
      .filter(Boolean);
    if (locationIds.length > 0) {
      const { data: events } = await supabase
        .from("event_triggers")
        .select("id")
        .in("location_id", locationIds)
        .eq("event_type", "reopen")
        .gte("created_at", targetDate + "T00:00:00")
        .lte("created_at", targetDate + "T23:59:59");
      if (events && events.length > 0) disciplineFlags.reopen = true;
    }

    const disciplinePoints = (!disciplineFlags.late_start && !disciplineFlags.cancel && !disciplineFlags.reopen)
      ? config.discipline_full : 0;

    const totalPoints = Math.min(productivityPoints + qualityPoints + disciplinePoints, 100);

    const explanationParts = [
      `פרודוקטיביות ${productivityPoints}/50 (${Math.round(variancePercent)}% מהתקן)`,
      `איכות ${qualityPoints}/30${auditAvg !== null ? ` (${auditAvg.toFixed(1)})` : " (אין ביקורת)"}`,
      `משמעת ${disciplinePoints}/20`,
      `סה"כ ${totalPoints}`,
    ];

    const scoreRow = {
      worker_id,
      score_date: targetDate,
      productivity_points: productivityPoints,
      quality_points: qualityPoints,
      discipline_points: disciplinePoints,
      total_points: totalPoints,
      planned_minutes_total: plannedMinutes,
      actual_minutes_total: actualMinutes,
      variance_percent: Math.round(variancePercent * 10) / 10,
      audit_avg_score_used: auditAvg,
      discipline_flags: disciplineFlags,
      explanation_text: explanationParts.join(" | "),
    };

    const { data, error } = await supabase
      .from("daily_worker_scores")
      .upsert(scoreRow, { onConflict: "worker_id,score_date" })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
