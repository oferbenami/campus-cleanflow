import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  // Authenticate caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user: caller } } = await callerClient.auth.getUser();
  if (!caller) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify caller has manager role
  const { data: roleData } = await callerClient
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id)
    .single();

  if (!roleData || !["campus_manager", "property_manager"].includes(roleData.role)) {
    return new Response(JSON.stringify({ error: "Forbidden: manager role required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const demoStaff = [
    { email: "sara.cohen@demo.cleanflow.local", full_name: "שרה כהן", initials: "שכ" },
    { email: "david.levi@demo.cleanflow.local", full_name: "דוד לוי", initials: "דל" },
    { email: "maya.katz@demo.cleanflow.local", full_name: "מאיה כץ", initials: "מכ" },
    { email: "oren.mor@demo.cleanflow.local", full_name: "אורן מור", initials: "אמ" },
    { email: "noa.peretz@demo.cleanflow.local", full_name: "נועה פרץ", initials: "נפ" },
    { email: "ron.aviv@demo.cleanflow.local", full_name: "רון אביב", initials: "רא" },
    { email: "liat.golan@demo.cleanflow.local", full_name: "ליאת גולן", initials: "לג" },
    { email: "yossi.hadad@demo.cleanflow.local", full_name: "יוסי חדד", initials: "יח" },
  ];

  const siteId = "37027ccd-c7d7-4d77-988d-6da914e347b4";
  const results: any[] = [];

  for (const staff of demoStaff) {
    // Check if already exists
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", staff.email)
      .maybeSingle();

    if (existing) {
      results.push({ email: staff.email, status: "exists" });
      continue;
    }

    // Create auth user
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: staff.email,
      password: "Demo1234!",
      email_confirm: true,
      user_metadata: { full_name: staff.full_name },
    });

    if (authErr) {
      results.push({ email: staff.email, status: "error", message: authErr.message });
      continue;
    }

    const userId = authData.user.id;

    // Update profile with site_id and initials
    await supabaseAdmin
      .from("profiles")
      .update({ avatar_initials: staff.initials, site_id: siteId, email: staff.email })
      .eq("id", userId);

    results.push({ email: staff.email, status: "created", userId });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
