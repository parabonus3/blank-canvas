import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Product ID to tier mapping
const PRODUCT_TIER_MAP: Record<string, string> = {
  // Pro products
  "prod_U9cV4fuZjYahhc": "pro",
  "prod_U9cVTsdR19wOvY": "pro",
  "prod_U2XhJsja0hQj1w": "pro",
  "prod_U2XkpL9hN68Gjn": "pro",
  "prod_U7AHwT0K5dTEB7": "pro",
  "prod_U7AJBjf96NNNx6": "pro",
  // Premium products
  "prod_U9cW1bur6JaHIy": "premium",
  "prod_U9cXdUEoYVf070": "premium",
  "prod_U2XlgWOl7aJNKN": "premium",
  "prod_U2XlbGDQP8G5FM": "premium",
  "prod_U7ALKqBXBiZkH3": "premium",
  "prod_U7AM9GTRJYqVNV": "premium",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ subscribed: false, error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      logStep("Auth error (non-fatal)", { message: userError.message });
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found");
      // Update plan_tier to free
      await supabaseClient.from("profiles").update({ plan_tier: "free" }).eq("user_id", user.id);
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let priceId = null;
    let subscriptionEnd = null;
    let pendingPlanChange = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      const subItem = subscription.items.data[0];
      const periodEnd = subItem?.current_period_end ?? subscription.current_period_end;
      if (periodEnd && typeof periodEnd === "number") {
        subscriptionEnd = new Date(periodEnd * 1000).toISOString();
      }
      productId = subscription.items.data[0]?.price?.product ?? null;
      priceId = subscription.items.data[0]?.price?.id ?? null;
      logStep("Active subscription found", { productId, priceId, subscriptionEnd });

      // Update plan_tier in profiles
      const tier = typeof productId === "string" ? (PRODUCT_TIER_MAP[productId] || "free") : "free";
      await supabaseClient.from("profiles").update({ plan_tier: tier }).eq("user_id", user.id);
      logStep("Updated plan_tier", { tier });

      // Check for pending plan change via subscription schedule
      if (subscription.schedule) {
        const scheduleId = typeof subscription.schedule === 'string'
          ? subscription.schedule
          : subscription.schedule.id;
        
        try {
          const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
          logStep("Schedule found", { scheduleId, status: schedule.status, phasesCount: schedule.phases?.length });

          if (schedule.status === "active" && schedule.phases && schedule.phases.length > 1) {
            const nextPhase = schedule.phases[schedule.phases.length - 1];
            const nextPriceId = nextPhase.items[0]?.price;
            const effectiveDate = nextPhase.start_date 
              ? new Date(nextPhase.start_date * 1000).toISOString()
              : subscriptionEnd;

            if (nextPriceId && nextPriceId !== priceId) {
              const nextPriceObj = await stripe.prices.retrieve(nextPriceId as string);
              pendingPlanChange = {
                newPriceId: nextPriceId,
                newProductId: nextPriceObj.product,
                effectiveDate,
                scheduleId,
              };
              logStep("Pending plan change detected", pendingPlanChange);
            }
          }
        } catch (scheduleError) {
          logStep("Error fetching schedule (non-fatal)", { error: String(scheduleError) });
        }
      }
    } else {
      logStep("No active subscription found");
      // Update plan_tier to free
      await supabaseClient.from("profiles").update({ plan_tier: "free" }).eq("user_id", user.id);
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      price_id: priceId,
      subscription_end: subscriptionEnd,
      pending_plan_change: pendingPlanChange,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
