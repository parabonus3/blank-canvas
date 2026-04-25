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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");

    const callerId = userData.user.id;
    logStep("Caller authenticated", { callerId });

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

    const { action, payload } = await req.json();
    logStep("Action requested", { action });

    const getStripe = () => {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) throw new Error("Stripe not configured");
      return new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    };

    switch (action) {
      case "list_users": {
        const page = Math.max(1, payload?.page || 1);
        const perPage = Math.min(200, payload?.perPage || 50);
        const search: string = (payload?.search || "").trim().toLowerCase();
        const filters = payload?.filters || {};
        const sort = payload?.sort || "created_desc";

        // Fetch ALL auth users (paginated 1000 at a time) so we can apply filters server-side
        let allAuthUsers: any[] = [];
        let authPage = 1;
        while (true) {
          const { data: page1 } = await supabaseAdmin.auth.admin.listUsers({ page: authPage, perPage: 1000 });
          const users = page1?.users || [];
          allAuthUsers = allAuthUsers.concat(users);
          if (users.length < 1000) break;
          authPage++;
          if (authPage > 20) break; // safety: max 20k users
        }

        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("user_id, display_name, trial_ends_at, friend_code, plan_tier, is_banned, banned_at, banned_reason, created_at");

        const { data: roles } = await supabaseAdmin
          .from("user_roles")
          .select("user_id, role");

        const { data: agents } = await supabaseAdmin
          .from("support_agents")
          .select("user_id, role, is_active");

        // Stripe subscriptions
        const stripe = getStripe();
        const stripeSubscriptions: Record<string, any> = {};
        try {
          let starting_after: string | undefined;
          let safety = 0;
          while (safety < 20) {
            const subs = await stripe.subscriptions.list({ status: "active", limit: 100, starting_after });
            for (const sub of subs.data) {
              try {
                const customer = await stripe.customers.retrieve(sub.customer as string) as any;
                if (customer?.email) {
                  let periodEnd: string | null = null;
                  try {
                    if (sub.current_period_end) {
                      periodEnd = new Date(sub.current_period_end * 1000).toISOString();
                    }
                  } catch {}
                  stripeSubscriptions[customer.email] = {
                    status: sub.status,
                    product_id: sub.items.data[0]?.price?.product,
                    price_id: sub.items.data[0]?.price?.id,
                    current_period_end: periodEnd,
                    subscription_id: sub.id,
                  };
                }
              } catch {}
            }
            if (!subs.has_more) break;
            starting_after = subs.data[subs.data.length - 1]?.id;
            safety++;
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
        const agentMap = new Map<string, { role: string; is_active: boolean }>();
        (agents || []).forEach((a: any) => agentMap.set(a.user_id, { role: a.role, is_active: a.is_active }));

        const enriched = allAuthUsers.map((u: any) => {
          const profile = profileMap.get(u.id) as any;
          const subscription = stripeSubscriptions[u.email] || null;
          const trialEndsAt = profile?.trial_ends_at;
          const now = new Date();
          const isBanned = profile?.is_banned === true;

          let status = "free";
          if (isBanned) status = "banned";
          else if (subscription) status = "active";
          else if (trialEndsAt && new Date(trialEndsAt) > now) status = "trial";
          else if (trialEndsAt) status = "expired";

          const userRoles = roleMap.get(u.id) || [];
          const agent = agentMap.get(u.id);

          return {
            id: u.id,
            email: u.email,
            display_name: profile?.display_name || null,
            friend_code: profile?.friend_code || null,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            trial_ends_at: trialEndsAt,
            plan_tier: profile?.plan_tier || "free",
            roles: userRoles,
            is_admin: userRoles.includes("admin"),
            is_support_agent: !!agent?.is_active,
            support_agent_role: agent?.role || null,
            is_banned: isBanned,
            banned_at: profile?.banned_at || null,
            banned_reason: profile?.banned_reason || null,
            subscription,
            status,
          };
        });

        // Apply search
        let filtered = enriched;
        if (search) {
          filtered = filtered.filter((u) =>
            (u.email || "").toLowerCase().includes(search) ||
            (u.display_name || "").toLowerCase().includes(search) ||
            (u.friend_code || "").toLowerCase().includes(search) ||
            u.id.toLowerCase().includes(search)
          );
        }

        // Apply filters
        if (filters.status && filters.status !== "all") {
          filtered = filtered.filter((u) => u.status === filters.status);
        }
        if (filters.role && filters.role !== "all") {
          if (filters.role === "admin") filtered = filtered.filter((u) => u.is_admin);
          else if (filters.role === "agent") filtered = filtered.filter((u) => u.is_support_agent);
          else if (filters.role === "user") filtered = filtered.filter((u) => !u.is_admin && !u.is_support_agent);
        }
        if (filters.plan && filters.plan !== "all") {
          filtered = filtered.filter((u) => u.plan_tier === filters.plan);
        }
        if (filters.signup_period && filters.signup_period !== "all") {
          const now = Date.now();
          const day = 24 * 60 * 60 * 1000;
          const map: Record<string, number> = { "1d": 1, "7d": 7, "30d": 30 };
          const days = map[filters.signup_period];
          if (days) filtered = filtered.filter((u) => now - new Date(u.created_at).getTime() <= days * day);
        }
        if (filters.trial_expiring && filters.trial_expiring !== "all") {
          const now = Date.now();
          const day = 24 * 60 * 60 * 1000;
          const map: Record<string, number> = { "3d": 3, "7d": 7, "30d": 30 };
          const days = map[filters.trial_expiring];
          if (days) filtered = filtered.filter((u) => {
            if (!u.trial_ends_at) return false;
            const t = new Date(u.trial_ends_at).getTime();
            return t > now && t - now <= days * day;
          });
        }
        if (filters.activity && filters.activity !== "all") {
          const now = Date.now();
          const day = 24 * 60 * 60 * 1000;
          if (filters.activity === "active_30d") {
            filtered = filtered.filter((u) => u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() <= 30 * day);
          } else if (filters.activity === "inactive_30d") {
            filtered = filtered.filter((u) => !u.last_sign_in_at || now - new Date(u.last_sign_in_at).getTime() > 30 * day);
          }
        }

        // Sort
        filtered.sort((a, b) => {
          switch (sort) {
            case "created_asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            case "last_sign_in_desc": return new Date(b.last_sign_in_at || 0).getTime() - new Date(a.last_sign_in_at || 0).getTime();
            case "email_asc": return (a.email || "").localeCompare(b.email || "");
            case "plan": return (b.plan_tier || "").localeCompare(a.plan_tier || "");
            case "created_desc":
            default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
        });

        const total = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / perPage));
        const pageUsers = filtered.slice((page - 1) * perPage, page * perPage);

        // Global stats from full enriched set (not filtered)
        const stats = {
          total_users: enriched.length,
          active: enriched.filter((u) => u.status === "active").length,
          trial: enriched.filter((u) => u.status === "trial").length,
          expired: enriched.filter((u) => u.status === "expired").length,
          banned: enriched.filter((u) => u.status === "banned").length,
          new_today: enriched.filter((u) => {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            return new Date(u.created_at).getTime() >= today.getTime();
          }).length,
        };

        return new Response(JSON.stringify({ users: pageUsers, total, page, totalPages, stats }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "ban_user": {
        const { user_id, reason } = payload;
        if (!user_id) throw new Error("user_id required");
        if (user_id === callerId) throw new Error("Cannot ban yourself");

        await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: "876000h" } as any);
        await supabaseAdmin
          .from("profiles")
          .update({ is_banned: true, banned_at: new Date().toISOString(), banned_reason: reason || null })
          .eq("user_id", user_id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "unban_user": {
        const { user_id } = payload;
        if (!user_id) throw new Error("user_id required");

        await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: "none" } as any);
        await supabaseAdmin
          .from("profiles")
          .update({ is_banned: false, banned_at: null, banned_reason: null })
          .eq("user_id", user_id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "grant_role": {
        const { user_id, role } = payload;
        if (!user_id || !role) throw new Error("user_id and role required");
        const { error } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id, role });
        if (error && !error.message.includes("duplicate")) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "revoke_role": {
        const { user_id, role } = payload;
        if (!user_id || !role) throw new Error("user_id and role required");
        if (user_id === callerId && role === "admin") throw new Error("Cannot revoke your own admin role");
        const { error } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", user_id)
          .eq("role", role);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "grant_support_agent": {
        const { user_id, role = "agent" } = payload;
        if (!user_id) throw new Error("user_id required");
        const { error } = await supabaseAdmin
          .from("support_agents")
          .upsert({ user_id, role, is_active: true, invited_by: callerId }, { onConflict: "user_id" });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "revoke_support_agent": {
        const { user_id } = payload;
        if (!user_id) throw new Error("user_id required");
        if (user_id === callerId) throw new Error("Cannot revoke your own support access");
        await supabaseAdmin
          .from("support_agents")
          .update({ is_active: false })
          .eq("user_id", user_id);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_user_details": {
        const { user_id } = payload;
        if (!user_id) throw new Error("user_id required");

        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user_id);
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("*")
          .eq("user_id", user_id)
          .maybeSingle();
        const { data: timeAgg } = await supabaseAdmin
          .from("time_entries")
          .select("duration")
          .eq("user_id", user_id)
          .not("end_time", "is", null);
        const totalSeconds = (timeAgg || []).reduce((s: number, e: any) => s + (e.duration || 0), 0);
        const { data: tickets } = await supabaseAdmin
          .from("support_tickets")
          .select("id, subject, status, created_at")
          .eq("user_id", user_id)
          .order("created_at", { ascending: false })
          .limit(10);
        const { count: roomCount } = await supabaseAdmin
          .from("room_members")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user_id);

        return new Response(JSON.stringify({
          auth: authUser?.user || null,
          profile: profile || null,
          total_seconds: totalSeconds,
          tickets: tickets || [],
          room_count: roomCount || 0,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "assign_plan": {
        const { user_id, price_id } = payload;
        if (!user_id) throw new Error("user_id required");

        const stripe = getStripe();
        const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(user_id);
        if (!targetUser?.user?.email) throw new Error("User not found");
        const email = targetUser.user.email;

        let customerId: string;
        const customers = await stripe.customers.list({ email, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          const existingSubs = await stripe.subscriptions.list({ customer: customerId, status: "active" });
          for (const sub of existingSubs.data) {
            await stripe.subscriptions.cancel(sub.id);
          }
        } else {
          const customer = await stripe.customers.create({ email });
          customerId = customer.id;
        }

        if (!price_id || price_id === "free") {
          return new Response(JSON.stringify({ success: true, plan: "free" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

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

        return new Response(JSON.stringify({ success: true, subscription_id: subscription.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset_password": {
        const { user_id } = payload;
        if (!user_id) throw new Error("user_id required");

        const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(user_id);
        if (!targetUser?.user?.email) throw new Error("User not found");

        const { error } = await supabaseAdmin.auth.admin.generateLink({
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
        } catch {}

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
        const { error } = await supabaseAdmin.from("profiles").update(updates).eq("user_id", user_id);
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
