import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const callerId = claims.claims.sub as string;

    // Check if caller is support admin
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: agentRow } = await adminClient
      .from("support_agents")
      .select("role")
      .eq("user_id", callerId)
      .eq("is_active", true)
      .single();

    if (!agentRow || agentRow.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "invite_agent") {
      const { email, password, role = "agent" } = body;
      if (!email || !password) {
        return new Response(JSON.stringify({ error: "Email and password required" }), { status: 400, headers: corsHeaders });
      }

      // Create user via admin API
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        // User might already exist
        if (createError.message?.includes("already")) {
          // Find existing user
          const { data: existingUsers } = await adminClient.auth.admin.listUsers();
          const existing = existingUsers?.users?.find((u: any) => u.email === email);
          if (existing) {
            // Add as agent
            const { error: insertErr } = await adminClient
              .from("support_agents")
              .upsert({ user_id: existing.id, role, invited_by: callerId, is_active: true }, { onConflict: "user_id" });
            if (insertErr) {
              return new Response(JSON.stringify({ error: insertErr.message }), { status: 400, headers: corsHeaders });
            }
            return new Response(JSON.stringify({ success: true, user_id: existing.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
        return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: corsHeaders });
      }

      // Insert agent record
      await adminClient
        .from("support_agents")
        .insert({ user_id: newUser.user.id, role, invited_by: callerId });

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "deactivate_agent") {
      const { agent_user_id } = body;
      if (!agent_user_id) {
        return new Response(JSON.stringify({ error: "agent_user_id required" }), { status: 400, headers: corsHeaders });
      }
      // Don't let admin deactivate themselves
      if (agent_user_id === callerId) {
        return new Response(JSON.stringify({ error: "Cannot deactivate yourself" }), { status: 400, headers: corsHeaders });
      }
      await adminClient
        .from("support_agents")
        .update({ is_active: false })
        .eq("user_id", agent_user_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "activate_agent") {
      const { agent_user_id } = body;
      if (!agent_user_id) {
        return new Response(JSON.stringify({ error: "agent_user_id required" }), { status: 400, headers: corsHeaders });
      }
      await adminClient
        .from("support_agents")
        .update({ is_active: true })
        .eq("user_id", agent_user_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "get_ticket_user_info") {
      const { ticket_user_id } = body;
      if (!ticket_user_id) {
        return new Response(JSON.stringify({ error: "ticket_user_id required" }), { status: 400, headers: corsHeaders });
      }
      const { data: profile } = await adminClient
        .from("profiles")
        .select("display_name, avatar_url, plan_tier, created_at, timezone")
        .eq("user_id", ticket_user_id)
        .single();

      const { data: totalTime } = await adminClient
        .from("time_entries")
        .select("duration")
        .eq("user_id", ticket_user_id)
        .not("end_time", "is", null);

      const totalSeconds = (totalTime || []).reduce((sum: number, e: any) => sum + (e.duration || 0), 0);

      return new Response(JSON.stringify({
        profile: profile || null,
        total_seconds: totalSeconds,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
