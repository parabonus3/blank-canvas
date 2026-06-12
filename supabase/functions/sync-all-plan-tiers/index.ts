// Admin edge function: scans every active Stripe customer and syncs profiles.plan_tier
// based on their current active subscription. Inactive/no-sub customers are set to "free".
//
// Auth: requires an authenticated admin caller (has_role(uid,'admin')).
// Run from the Supabase dashboard or via curl with a valid admin JWT.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRODUCT_TIER_MAP: Record<string, string> = {
  "prod_U9cV4fuZjYahhc": "pro",
  "prod_U9cVTsdR19wOvY": "pro",
  "prod_U2XhJsja0hQj1w": "pro",
  "prod_U2XkpL9hN68Gjn": "pro",
  "prod_U7AHwT0K5dTEB7": "pro",
  "prod_U7AJBjf96NNNx6": "pro",
  "prod_U9cW1bur6JaHIy": "premium",
  "prod_U9cXdUEoYVf070": "premium",
  "prod_U2XlgWOl7aJNKN": "premium",
  "prod_U2XlbGDQP8G5FM": "premium",
  "prod_U7ALKqBXBiZkH3": "premium",
  "prod_U7AM9GTRJYqVNV": "premium",
};

const log = (s: string, d?: any) => console.log(`[SYNC-PLAN-TIERS] ${s}${d ? " - " + JSON.stringify(d) : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!stripeKey || !supabaseUrl || !serviceRole) {
      return new Response(JSON.stringify({ error: "Missing server env" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(supabaseUrl, serviceRole);
    const userClient = createClient(supabaseUrl, serviceRole, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    const uid = userData.user?.id;
    if (!uid) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const report: { email: string; tier: string; updated: number }[] = [];
    let processed = 0;

    // Iterate every Stripe customer
    for await (const customer of (stripe.customers.list({ limit: 100 }) as any).autoPagingEach
      ? (stripe.customers.list({ limit: 100 }) as any)
      : await (async () => {
          // Fallback manual pagination
          const out: any[] = [];
          let starting_after: string | undefined = undefined;
          while (true) {
            const page = await stripe.customers.list({ limit: 100, starting_after });
            out.push(...page.data);
            if (!page.has_more) break;
            starting_after = page.data[page.data.length - 1].id;
          }
          return out;
        })()) {
      const c = customer as Stripe.Customer;
      if (!c.email) continue;
      processed++;

      let tier = "free";
      try {
        const subs = await stripe.subscriptions.list({ customer: c.id, status: "active", limit: 1 });
        if (subs.data.length > 0) {
          const productId = subs.data[0].items.data[0]?.price?.product;
          if (typeof productId === "string") tier = PRODUCT_TIER_MAP[productId] || "free";
        }
      } catch (e) {
        log("subs.list error", { customerId: c.id, message: (e as Error).message });
        continue;
      }

      const { data: updated, error } = await admin.rpc("admin_set_plan_tier_by_email", {
        _email: c.email, _tier: tier,
      });
      if (error) {
        log("rpc error", { email: c.email, message: error.message });
      } else {
        report.push({ email: c.email, tier, updated: Number(updated || 0) });
      }
    }

    log("done", { processed, changed: report.length });
    return new Response(JSON.stringify({ processed, results: report }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log("ERROR", { message: e instanceof Error ? e.message : String(e) });
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
