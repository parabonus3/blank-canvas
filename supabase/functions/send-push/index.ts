// Send web push to a user. Internal helper + HTTP endpoint.
// HTTP body: { user_id?: string, kind: string, vars?: Record<string, any>, url?: string }
// If user_id is omitted, sends to the authenticated caller (used for "send test" button).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";
import { pickTemplate, type NotifKind } from "../_shared/notif-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contato@timezoni.com";

console.log("[send-push] boot", {
  hasPub: !!VAPID_PUBLIC,
  hasPriv: !!VAPID_PRIVATE,
  hasSR: !!SERVICE_ROLE,
});

let vapidReady = false;
function initWebPush(): boolean {
  if (vapidReady) return true;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false;
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    vapidReady = true;
    return true;
  } catch (e) {
    console.error("[send-push] setVapidDetails failed", e);
    return false;
  }
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

interface SendArgs {
  userId: string;
  kind: NotifKind | string;
  vars?: Record<string, string | number>;
  url?: string;
  bypassPrefs?: boolean;
}

function inQuietHours(now: Date, tz: string, startH: number, endH: number): boolean {
  try {
    const hour = Number(
      new Intl.DateTimeFormat("en-US", { hour: "2-digit", hour12: false, timeZone: tz }).format(now),
    );
    if (startH === endH) return false;
    if (startH < endH) return hour >= startH && hour < endH;
    return hour >= startH || hour < endH;
  } catch {
    return false;
  }
}

// Event-driven kinds: fired by DB triggers, deduped by payload instead of by kind.
const INSTANT_KINDS = new Set([
  "friend_request",
  "friend_accepted",
  "board_invite",
  "task_assigned",
  "task_comment",
  "chat_mentions",
]);

function hashPayload(kind: string, vars: Record<string, string | number>): string {
  const raw = kind + "|" + Object.keys(vars).sort().map((k) => `${k}=${vars[k]}`).join("&");
  let h = 5381;
  for (let i = 0; i < raw.length; i++) h = ((h * 33) ^ raw.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

export async function sendPushToUser(args: SendArgs): Promise<{ sent: number; skipped: string | null }> {
  const { userId, kind, vars = {}, url = "/", bypassPrefs = false } = args;
  const isInstant = INSTANT_KINDS.has(kind as string);
  const payloadHash = hashPayload(kind as string, vars);


  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth,lang,timezone")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return { sent: 0, skipped: "no-subs" };

  if (!bypassPrefs) {
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const prefKey: Record<string, string> = {
      room_goal_reminder: "room_goal_reminder",
      streak_risk: "streak_risk",
      room_challenge_deadline: "room_challenge_deadline",
      re_engagement: "re_engagement",
      weekly_recap: "weekly_recap",
      friend_activity: "friend_activity",
      chat_mentions: "chat_mentions",
      friend_request: "social_invites",
      friend_accepted: "social_invites",
      board_invite: "social_invites",
      task_assigned: "task_updates",
      task_comment: "task_updates",
      task_due_today: "task_updates",
      morning_kickoff: "morning_kickoff",
    };
    if (prefs) {
      const key = prefKey[kind];
      if (key && (prefs as any)[key] !== undefined && (prefs as any)[key] === false) {
        return { sent: 0, skipped: "pref-off" };
      }

      const tz = subs[0].timezone || "America/Sao_Paulo";
      if (inQuietHours(new Date(), tz, prefs.quiet_hours_start ?? 22, prefs.quiet_hours_end ?? 8)) {
        return { sent: 0, skipped: "quiet-hours" };
      }

      if (isInstant) {
        // Event-driven: dedup by exact payload (same person + same item) in last 12h,
        // so distinct invites/assignments all arrive but duplicates never do.
        const since12 = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
        const { count: samePayload } = await admin
          .from("notification_log")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("kind", kind)
          .eq("payload_hash", payloadHash)
          .gte("sent_at", since12);
        if ((samePayload ?? 0) > 0) return { sent: 0, skipped: "dedup" };
      } else {
        // max per day (scheduled digests only)
        const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const { count } = await admin
          .from("notification_log")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("sent_at", since);
        if ((count ?? 0) >= (prefs.max_per_day ?? 3)) return { sent: 0, skipped: "max-per-day" };

        // dedup same kind in last 12h
        const since12 = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
        const { count: sameKind } = await admin
          .from("notification_log")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("kind", kind)
          .gte("sent_at", since12);
        if ((sameKind ?? 0) > 0) return { sent: 0, skipped: "dedup" };
      }
    }
  }

  if (!initWebPush()) {
    console.error("[send-push] VAPID keys missing - cannot send");
    return { sent: 0, skipped: "not-configured" };
  }

  let sent = 0;
  for (const s of subs) {
    const lang = s.lang || "en-US";
    const { title, body } = pickTemplate(kind as NotifKind, lang, vars);
    // Use the actor's avatar (inviter / assigner / commenter) as the notification icon
    // so the person's photo shows up; fall back to the app icon.
    const actorAvatar = typeof (vars as any)?.actor_avatar === "string" && (vars as any).actor_avatar
      ? String((vars as any).actor_avatar)
      : null;
    const payload = JSON.stringify({
      title,
      body,
      url,
      kind,
      icon: actorAvatar ?? "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    });
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any,
        payload,
        { TTL: 3600 },
      );
      sent++;
      await admin
        .from("notification_log")
        .insert({ user_id: userId, kind, lang, payload_hash: payloadHash, meta: { url } });
    } catch (err: any) {
      const status = err?.statusCode;
      if (status === 404 || status === 410) {
        await admin.from("push_subscriptions").delete().eq("id", s.id);
      } else {
        await admin
          .from("push_subscriptions")
          .update({ failure_count: 1, last_error_at: new Date().toISOString() })
          .eq("id", s.id);
      }
    }
  }
  return { sent, skipped: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    let userId: string | null = body.user_id ?? null;

    if (!userId) {
      const authHeader = req.headers.get("Authorization") ?? "";
      const token = authHeader.replace("Bearer ", "");
      if (!token) throw new Error("missing-auth");
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await userClient.auth.getUser(token);
      userId = data.user?.id ?? null;
      if (!userId) throw new Error("not-authenticated");
    }

    const result = await sendPushToUser({
      userId,
      kind: body.kind || "test",
      vars: body.vars || {},
      url: body.url || "/",
      bypassPrefs: body.kind === "test",
    });
    if (result.skipped === "not-configured") {
      return new Response(
        JSON.stringify({ error: "push-not-configured", ...result }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
