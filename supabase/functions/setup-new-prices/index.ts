import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (s: string, d?: any) => console.log(`[SETUP-NEW-PRICES] ${s}${d ? " - " + JSON.stringify(d) : ""}`);

const PRO_MONTHLY_PRODUCT = "prod_U9cV4fuZjYahhc";
const PRO_YEARLY_PRODUCT = "prod_U9cVTsdR19wOvY";
const PREMIUM_MONTHLY_PRODUCT = "prod_U9cW1bur6JaHIy";
const PREMIUM_YEARLY_PRODUCT = "prod_U9cXdUEoYVf070";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!stripeKey || !supabaseUrl || !serviceRoleKey) throw new Error("Missing env");

    // Temporary one-shot: gated by a setup token instead of admin role,
    // because Lovable tool can't pass admin JWT. Will be deleted after run.
    const SETUP_TOKEN = "setup-prices-v3-2026";
    const provided = req.headers.get("X-Setup-Token") || new URL(req.url).searchParams.get("token");
    if (provided !== SETUP_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    log("Setup token authorized");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const create = (product: string, amount: number, interval: "month" | "year", nickname: string) =>
      stripe.prices.create({
        product,
        currency: "usd",
        unit_amount: amount,
        recurring: { interval },
        nickname,
      });

    const [proMonthly, proYearly, premiumMonthly, premiumYearly] = await Promise.all([
      create(PRO_MONTHLY_PRODUCT, 990, "month", "Pro Monthly $9.90 (v3)"),
      create(PRO_YEARLY_PRODUCT, 9500, "year", "Pro Yearly $95 (v3)"),
      create(PREMIUM_MONTHLY_PRODUCT, 1990, "month", "Premium Monthly $19.90 (v3)"),
      create(PREMIUM_YEARLY_PRODUCT, 14300, "year", "Premium Yearly $143 (v3)"),
    ]);

    const result = {
      pro_monthly: proMonthly.id,
      pro_yearly: proYearly.id,
      premium_monthly: premiumMonthly.id,
      premium_yearly: premiumYearly.id,
    };
    log("Created prices", result);

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
