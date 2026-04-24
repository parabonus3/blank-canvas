import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    const body = await req.json();
    const { priceId, cancelPendingChange } = body;

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found for this user");
    }
    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Find active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
      expand: ["data.schedule"],
    });

    if (subscriptions.data.length === 0) {
      throw new Error("No active subscription found");
    }

    let subscription = subscriptions.data[0];
    const existingItem = subscription.items.data[0];
    if (!existingItem) {
      throw new Error("No subscription item found");
    }

    // Handle cancel pending change request
    if (cancelPendingChange) {
      logStep("Cancelling pending change");
      if (subscription.schedule) {
        const scheduleId = typeof subscription.schedule === 'string' 
          ? subscription.schedule 
          : subscription.schedule.id;
        try {
          await stripe.subscriptionSchedules.release(scheduleId);
          logStep("Schedule released", { scheduleId });
        } catch (e) {
          logStep("Failed to release schedule", { error: String(e) });
          throw new Error(`Failed to cancel pending change: ${e}`);
        }
      }
      return new Response(JSON.stringify({ success: true, type: "cancel_pending" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!priceId) throw new Error("priceId is required");
    logStep("New price ID", { priceId });

    logStep("Current subscription", {
      subscriptionId: subscription.id,
      currentItemId: existingItem.id,
      currentPriceId: existingItem.price.id,
    });

    // Check if already on this price
    if (existingItem.price.id === priceId) {
      return new Response(JSON.stringify({ error: "Already on this plan" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Fetch both prices to determine upgrade vs downgrade
    const [currentPrice, newPrice] = await Promise.all([
      stripe.prices.retrieve(existingItem.price.id),
      stripe.prices.retrieve(priceId),
    ]);

    const currentAmount = currentPrice.unit_amount ?? 0;
    const newAmount = newPrice.unit_amount ?? 0;

    logStep("Price comparison", { currentAmount, newAmount });

    const isUpgrade = newAmount > currentAmount;

    if (isUpgrade) {
      // UPGRADE: immediate with proration
      logStep("Processing UPGRADE (immediate)");

      // If there's a pending schedule, release it first
      if (subscription.schedule) {
        const scheduleId = typeof subscription.schedule === 'string'
          ? subscription.schedule
          : subscription.schedule.id;
        try {
          await stripe.subscriptionSchedules.release(scheduleId);
          logStep("Released existing schedule before upgrade");
        } catch (e) {
          logStep("Failed to release schedule (non-fatal)", { error: String(e) });
        }
        // Re-fetch subscription after schedule release
        subscription = await stripe.subscriptions.retrieve(subscription.id);
      }

      const updated = await stripe.subscriptions.update(subscription.id, {
        items: [
          { id: subscription.items.data[0].id, deleted: true },
          { price: priceId },
        ],
        proration_behavior: "create_prorations",
      });

      logStep("Upgrade completed", { updatedId: updated.id, status: updated.status });

      return new Response(JSON.stringify({
        success: true,
        type: "upgrade",
        subscriptionId: updated.id,
        effectiveDate: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // DOWNGRADE: schedule for end of current period using Subscription Schedules
      logStep("Processing DOWNGRADE (scheduled)");

      // If there's already a schedule, release it first and re-fetch
      if (subscription.schedule) {
        const scheduleId = typeof subscription.schedule === 'string'
          ? subscription.schedule
          : subscription.schedule.id;
        try {
          await stripe.subscriptionSchedules.release(scheduleId);
          logStep("Released existing schedule before creating new one");
        } catch (e) {
          logStep("Failed to release schedule (non-fatal)", { error: String(e) });
        }
        // Re-fetch subscription to get fresh data after schedule release
        subscription = await stripe.subscriptions.retrieve(subscription.id);
      }

      // Validate period timestamps - In Stripe API v2025, period fields are on items, not subscription root
      const subscriptionItem = subscription.items.data[0];
      const periodEnd = subscriptionItem?.current_period_end ?? subscription.current_period_end;
      const periodStart = subscriptionItem?.current_period_start ?? subscription.current_period_start;
      logStep("Period timestamps", { periodEnd, periodStart, typeEnd: typeof periodEnd, typeStart: typeof periodStart });

      if (!periodEnd || !periodStart) {
        throw new Error(`Missing period data: start=${periodStart}, end=${periodEnd}`);
      }

      // Handle both number (unix) and string/Date formats
      const periodEndTs = typeof periodEnd === 'number' ? periodEnd : Math.floor(new Date(periodEnd as any).getTime() / 1000);
      const periodStartTs = typeof periodStart === 'number' ? periodStart : Math.floor(new Date(periodStart as any).getTime() / 1000);

      if (isNaN(periodEndTs) || isNaN(periodStartTs)) {
        throw new Error(`Invalid period timestamps: start=${periodStart}, end=${periodEnd}`);
      }

      // Create a schedule from the existing subscription
      const schedule = await stripe.subscriptionSchedules.create({
        from_subscription: subscription.id,
      });
      logStep("Schedule created from subscription", { scheduleId: schedule.id });

      // Update the schedule with two phases
      const currentPriceId = subscription.items.data[0]?.price?.id ?? existingItem.price.id;
      await stripe.subscriptionSchedules.update(schedule.id, {
        phases: [
          {
            items: [{ price: currentPriceId, quantity: 1 }],
            start_date: periodStartTs,
            end_date: periodEndTs,
          },
          {
            items: [{ price: priceId, quantity: 1 }],
            start_date: periodEndTs,
          },
        ],
      });

      const effectiveDate = new Date(periodEndTs * 1000).toISOString();
      logStep("Schedule updated with downgrade phases", { effectiveDate });

      return new Response(JSON.stringify({
        success: true,
        type: "downgrade",
        subscriptionId: subscription.id,
        effectiveDate,
        newPriceId: priceId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
