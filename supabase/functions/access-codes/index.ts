import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ACCESS-CODES] ${step}${d}`);
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I

function randomSegment(len: number) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

function generateCode(prefix?: string) {
  const base = `${randomSegment(5)}-${randomSegment(4)}`;
  const clean = (prefix || "TZ").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "TZ";
  return `${clean}-${base}`;
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

function validatePlan(plan: unknown): "pro" | "premium" {
  if (plan !== "pro" && plan !== "premium") throw new Error("plan_tier must be pro or premium");
  return plan;
}

function validateDays(days: unknown): number {
  const n = Number(days);
  if (!Number.isInteger(n) || n < 1 || n > 3650) throw new Error("duration_days must be between 1 and 3650");
  return n;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");
    const callerId = userData.user.id;

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) return json({ error: "Forbidden: admin role required" }, 403);

    const { action, payload } = await req.json();
    logStep("Action", { action, callerId });

    switch (action) {
      case "list_codes": {
        const search = (payload?.search || "").trim();
        const status = payload?.status || "all";
        const plan = payload?.plan || "all";
        const partner = (payload?.partner || "").trim();

        let query = supabaseAdmin
          .from("access_codes")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500);

        if (search) query = query.or(`code.ilike.%${search}%,partner_name.ilike.%${search}%,campaign.ilike.%${search}%`);
        if (plan !== "all") query = query.eq("plan_tier", plan);
        if (partner) query = query.eq("partner_name", partner);
        if (status === "active") query = query.eq("is_active", true);
        if (status === "inactive") query = query.eq("is_active", false);

        const { data: codes, error } = await query;
        if (error) throw error;

        const nowIso = new Date().toISOString();
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

        const [{ count: totalRedemptions }, { count: weekRedemptions }, { count: activeCodes }] = await Promise.all([
          supabaseAdmin.from("access_code_redemptions").select("id", { count: "exact", head: true }),
          supabaseAdmin
            .from("access_code_redemptions")
            .select("id", { count: "exact", head: true })
            .gte("created_at", weekAgo),
          supabaseAdmin
            .from("access_codes")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true)
            .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
        ]);

        const { data: partnersRows } = await supabaseAdmin
          .from("access_codes")
          .select("partner_name")
          .not("partner_name", "is", null)
          .limit(1000);
        const partners = Array.from(new Set((partnersRows || []).map((r: any) => r.partner_name).filter(Boolean)));

        return json({
          codes: codes || [],
          partners,
          stats: {
            active_codes: activeCodes ?? 0,
            total_redemptions: totalRedemptions ?? 0,
            week_redemptions: weekRedemptions ?? 0,
            total_codes: (codes || []).length,
          },
        });
      }

      case "create_code": {
        const plan_tier = validatePlan(payload?.plan_tier);
        const duration_days = validateDays(payload?.duration_days);
        const code_type = payload?.code_type === "single" ? "single" : "shared";
        const rawCode = payload?.code ? normalizeCode(payload.code) : generateCode(payload?.prefix);
        if (rawCode.length < 4 || rawCode.length > 40) throw new Error("code length must be 4-40 chars");
        if (!/^[A-Z0-9-]+$/.test(rawCode)) throw new Error("code must contain only letters, numbers and -");

        let max_redemptions: number | null = null;
        if (code_type === "single") {
          max_redemptions = 1;
        } else if (payload?.max_redemptions != null && payload.max_redemptions !== "") {
          const n = Number(payload.max_redemptions);
          if (!Number.isInteger(n) || n < 1 || n > 1000000) throw new Error("max_redemptions invalid");
          max_redemptions = n;
        }

        const { data, error } = await supabaseAdmin
          .from("access_codes")
          .insert({
            code: rawCode,
            plan_tier,
            duration_days,
            code_type,
            max_redemptions,
            expires_at: payload?.expires_at || null,
            partner_name: payload?.partner_name?.trim() || null,
            campaign: payload?.campaign?.trim() || null,
            notes: payload?.notes?.trim() || null,
            created_by: callerId,
          })
          .select("*")
          .single();

        if (error) {
          if ((error as any).code === "23505" || error.message?.includes("duplicate")) {
            return json({ error: "duplicate_code" }, 400);
          }
          throw error;
        }
        return json({ code: data });
      }

      case "create_batch": {
        const plan_tier = validatePlan(payload?.plan_tier);
        const duration_days = validateDays(payload?.duration_days);
        const quantity = Number(payload?.quantity);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
          throw new Error("quantity must be between 1 and 1000");
        }
        const batchId = crypto.randomUUID();
        const rows = Array.from({ length: quantity }, () => ({
          code: generateCode(payload?.prefix),
          plan_tier,
          duration_days,
          code_type: "single",
          max_redemptions: 1,
          expires_at: payload?.expires_at || null,
          partner_name: payload?.partner_name?.trim() || null,
          campaign: payload?.campaign?.trim() || null,
          notes: payload?.notes?.trim() || null,
          batch_id: batchId,
          created_by: callerId,
        }));

        const { data, error } = await supabaseAdmin.from("access_codes").insert(rows).select("*");
        if (error) throw error;
        return json({ codes: data || [], batch_id: batchId });
      }

      case "update_code": {
        const { code_id } = payload || {};
        if (!code_id) throw new Error("code_id required");
        const patch: Record<string, unknown> = {};
        if (payload.is_active !== undefined) patch.is_active = !!payload.is_active;
        if (payload.expires_at !== undefined) patch.expires_at = payload.expires_at || null;
        if (payload.max_redemptions !== undefined) {
          if (payload.max_redemptions === null || payload.max_redemptions === "") {
            patch.max_redemptions = null;
          } else {
            const n = Number(payload.max_redemptions);
            if (!Number.isInteger(n) || n < 1 || n > 1000000) throw new Error("max_redemptions invalid");
            patch.max_redemptions = n;
          }
        }
        if (payload.partner_name !== undefined) patch.partner_name = payload.partner_name?.trim() || null;
        if (payload.campaign !== undefined) patch.campaign = payload.campaign?.trim() || null;
        if (payload.notes !== undefined) patch.notes = payload.notes?.trim() || null;
        if (Object.keys(patch).length === 0) throw new Error("nothing to update");

        const { data, error } = await supabaseAdmin
          .from("access_codes")
          .update(patch)
          .eq("id", code_id)
          .select("*")
          .single();
        if (error) throw error;
        logStep("Code updated", { code_id, patch, callerId });
        return json({ code: data });
      }

      case "list_redemptions": {
        const { code_id } = payload || {};
        let query = supabaseAdmin
          .from("access_code_redemptions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500);
        if (code_id) query = query.eq("access_code_id", code_id);

        const { data: redemptions, error } = await query;
        if (error) throw error;

        const userIds = Array.from(new Set((redemptions || []).map((r: any) => r.user_id)));
        const { data: profiles } = userIds.length
          ? await supabaseAdmin.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds)
          : { data: [] as any[] };

        const emailMap: Record<string, string> = {};
        await Promise.all(
          userIds.slice(0, 200).map(async (uid) => {
            const { data } = await supabaseAdmin.auth.admin.getUserById(uid);
            if (data?.user?.email) emailMap[uid] = data.user.email;
          }),
        );

        const enriched = (redemptions || []).map((r: any) => {
          const p = (profiles || []).find((x: any) => x.user_id === r.user_id);
          return {
            ...r,
            display_name: p?.display_name ?? null,
            avatar_url: p?.avatar_url ?? null,
            email: emailMap[r.user_id] ?? null,
          };
        });

        return json({ redemptions: enriched });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return json({ error: message }, 400);
  }
});
