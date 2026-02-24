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

    const now = new Date();

    // Fetch all non-closed incidents
    const { data: incidents, error } = await supabase
      .from("incidents")
      .select("id, status, created_at, assigned_at, resolved_at, response_sla_minutes, resolution_sla_minutes, escalation_level")
      .not("status", "in", '("closed","resolved")');

    if (error) throw error;

    let escalated = 0;

    for (const inc of incidents || []) {
      const createdMs = new Date(inc.created_at).getTime();
      const elapsedMin = (now.getTime() - createdMs) / 60000;

      // Response SLA breach → escalation level 1
      if (!inc.assigned_at && elapsedMin > inc.response_sla_minutes && inc.escalation_level < 1) {
        await supabase
          .from("incidents")
          .update({ escalation_level: 1, escalated_at: now.toISOString() })
          .eq("id", inc.id);

        await supabase.from("incident_events_log").insert({
          incident_id: inc.id,
          event_type: "escalated",
          user_id: "00000000-0000-0000-0000-000000000000", // system
          event_payload: { level: 1, reason: "response_sla_breach", elapsed_min: Math.round(elapsedMin) },
        });
        escalated++;
      }

      // Resolution SLA breach → escalation level 2
      if (!inc.resolved_at && elapsedMin > inc.resolution_sla_minutes && inc.escalation_level < 2) {
        await supabase
          .from("incidents")
          .update({
            escalation_level: 2,
            escalated_at: now.toISOString(),
            status: "escalated",
          })
          .eq("id", inc.id);

        await supabase.from("incident_events_log").insert({
          incident_id: inc.id,
          event_type: "escalated",
          user_id: "00000000-0000-0000-0000-000000000000",
          event_payload: { level: 2, reason: "resolution_sla_breach", elapsed_min: Math.round(elapsedMin) },
        });
        escalated++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, checked: incidents?.length || 0, escalated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
