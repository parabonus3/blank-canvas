import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-USERS] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");

    const callerId = userData.user.id;
    logStep("Caller authenticated", { callerId });

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep("Admin role verified");

    const { action, payload } = await req.json();
    logStep("Action requested", { action });

    const getStripe = () => {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) throw new Error("Stripe not configured");
      return new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    };

    switch (action) {
      case "list_users": {
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({
          page: payload?.page || 1,
          perPage: payload?.perPage || 50,
        });

        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("user_id, display_name, trial_ends_at, created_at");

        const { data: roles } = await supabaseAdmin
          .from("user_roles")
          .select("user_id, role");

        const stripe = getStripe();
        let stripeSubscriptions: Record<string, any> = {};

        try {
          const subs = await stripe.subscriptions.list({ status: "active", limit: 100 });
          for (const sub of subs.data) {
            try {
              const customer = await stripe.customers.retrieve(sub.customer as string) as any;
              if (customer.email) {
                let periodEnd: string | null = null;
                try {
                  if (sub.current_period_end) {
                    periodEnd = new Date(sub.current_period_end * 1000).toISOString();
                  }
                } catch {
                  // Invalid date - leave as null
                }
                stripeSubscriptions[customer.email] = {
                  status: sub.status,
                  product_id: sub.items.data[0]?.price?.product,
                  price_id: sub.items.data[0]?.price?.id,
                  current_period_end: periodEnd,
                  subscription_id: sub.id,
                };
              }
            } catch (subError) {
              logStep("Error processing subscription (skipping)", {
                subId: sub.id,
                message: (subError as Error).message,
              });
            }
          }
        } catch (e) {
          logStep("Stripe error (non-fatal)", { message: (e as Error).message });
        }

        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        const roleMap = new Map<string, string[]>();
        (roles || []).forEach((r: any) => {
          const existing = roleMap.get(r.user_id) || [];
          existing.push(r.role);
          roleMap.set(r.user_id, existing);
        });

        const users = (authUsers?.users || []).map((u: any) => {
          const profile = profileMap.get(u.id) as any;
          const subscription = stripeSubscriptions[u.email] || null;
          const trialEndsAt = profile?.trial_ends_at;
          const now = new Date();
          
          let status = "free";
          if (subscription) {
            status = "active";
          } else if (trialEndsAt && new Date(trialEndsAt) > now) {
            status = "trial";
          } else if (trialEndsAt) {
            status = "expired";
          }

          return {
            id: u.id,
            email: u.email,
            display_name: profile?.display_name || null,
            created_at: u.created_at,
            trial_ends_at: trialEndsAt,
            roles: roleMap.get(u.id) || [],
            subscription,
            status,
          };
        });

        return new Response(JSON.stringify({ users, total: authUsers?.users?.length || 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "assign_plan": {
        const { user_id, price_id } = payload;
        if (!user_id) throw new Error("user_id required");

        const stripe = getStripe();

        // Get user email
        const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(user_id);
        if (!targetUser?.user?.email) throw new Error("User not found");
        const email = targetUser.user.email;

        // Find or create Stripe customer
        let customerId: string;
        const customers = await stripe.customers.list({ email, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;

          // Cancel any existing active subscriptions
          const existingSubs = await stripe.subscriptions.list({
            customer: customerId,
            status: "active",
          });
          for (const sub of existingSubs.data) {
            await stripe.subscriptions.cancel(sub.id);
            logStep("Cancelled existing subscription", { subId: sub.id });
          }
        } else {
          const customer = await stripe.customers.create({ email });
          customerId = customer.id;
          logStep("Created Stripe customer", { customerId });
        }

        if (!price_id || price_id === "free") {
          // Just cancel - already done above
          logStep("User set to Free plan", { email });
          return new Response(JSON.stringify({ success: true, plan: "free" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create a new subscription with a 100% coupon (admin courtesy)
        // First try to find or create a 100% off forever coupon
        let couponId: string;
        try {
          const coupon = await stripe.coupons.retrieve("admin_courtesy_100");
          couponId = coupon.id;
        } catch {
          const coupon = await stripe.coupons.create({
            id: "admin_courtesy_100",
            percent_off: 100,
            duration: "forever",
            name: "Admin Courtesy - 100% Off",
          });
          couponId = coupon.id;
        }

        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: price_id }],
          discounts: [{ coupon: couponId }],
        });

        logStep("Subscription created", { subId: subscription.id, priceId: price_id });

        return new Response(JSON.stringify({ success: true, subscription_id: subscription.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset_password": {
        const { user_id } = payload;
        if (!user_id) throw new Error("user_id required");

        const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(user_id);
        if (!targetUser?.user?.email) throw new Error("User not found");

        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email: targetUser.user.email,
          options: { redirectTo: `${req.headers.get("origin")}/reset-password` },
        });

        if (error) throw error;

        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({
              email: targetUser.user.email,
              type: "recovery",
              redirect_to: `${req.headers.get("origin")}/reset-password`,
            }),
          });
          logStep("Recovery email sent", { email: targetUser.user.email });
        } catch (e) {
          logStep("Email send error (non-fatal)", { message: (e as Error).message });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_profile": {
        const { user_id, display_name, trial_ends_at } = payload;
        if (!user_id) throw new Error("user_id required");

        const updates: any = {};
        if (display_name !== undefined) updates.display_name = display_name;
        if (trial_ends_at !== undefined) updates.trial_ends_at = trial_ends_at;

        const { error } = await supabaseAdmin
          .from("profiles")
          .update(updates)
          .eq("user_id", user_id);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "cancel_subscription": {
        const { subscription_id } = payload;
        if (!subscription_id) throw new Error("subscription_id required");

        const stripe = getStripe();
        await stripe.subscriptions.cancel(subscription_id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_user": {
        const { user_id } = payload;
        if (!user_id) throw new Error("user_id required");
        if (user_id === callerId) throw new Error("Cannot delete yourself");

        const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
