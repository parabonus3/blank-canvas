// Hourly cron entry-point. For each user, checks local hour (from any of their
// push subscriptions' timezone) and dispatches the appropriate notification.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendPushToUser } from "../send-push/index.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

function localHour(tz: string, now = new Date()): number {
  try {
    return Number(
      new Intl.DateTimeFormat("en-US", { hour: "2-digit", hour12: false, timeZone: tz }).format(now),
    );
  } catch {
    return new Date().getUTCHours();
  }
}

function localWeekday(tz: string, now = new Date()): number {
  // 0 = Sunday
  try {
    const fmt = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: tz }).format(now);
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(fmt);
  } catch {
    return now.getUTCDay();
  }
}

function localDate(tz: string, now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      year: "numeric", month: "2-digit", day: "2-digit", timeZone: tz,
    }).format(now);
    return parts; // YYYY-MM-DD
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

async function eligibleUsers(): Promise<{ user_id: string; tz: string }[]> {
  const { data } = await admin
    .from("push_subscriptions")
    .select("user_id,timezone");
  const map = new Map<string, string>();
  (data || []).forEach((row: any) => {
    if (!map.has(row.user_id)) map.set(row.user_id, row.timezone || "America/Sao_Paulo");
  });
  return Array.from(map, ([user_id, tz]) => ({ user_id, tz }));
}

async function processRoomGoalReminders(users: { user_id: string; tz: string }[]) {
  for (const u of users) {
    if (localHour(u.tz) !== 19) continue;
    // Find a room of this user with goal_hours > 0 and progress today < goal
    const today = localDate(u.tz);
    const { data: rooms } = await admin
      .from("room_members")
      .select("room_id, study_rooms!inner(id,name,goal_hours)")
      .eq("user_id", u.user_id);
    if (!rooms || rooms.length === 0) continue;
    for (const r of rooms as any[]) {
      const goal = r.study_rooms?.goal_hours;
      if (!goal || goal <= 0) continue;
      const { data: entries } = await admin
        .from("time_entries")
        .select("duration,start_time")
        .eq("user_id", u.user_id)
        .gte("start_time", `${today}T00:00:00`);
      const seconds = (entries || []).reduce((s: number, e: any) => s + (e.duration || 0), 0);
      if (seconds / 3600 >= goal) continue;
      const remaining = Math.max(1, Math.ceil(goal - seconds / 3600));
      await sendPushToUser({
        userId: u.user_id,
        kind: "room_goal_reminder",
        vars: { room_name: r.study_rooms.name, remaining_h: remaining },
        url: `/rooms/${r.room_id}`,
      });
      break; // only one room reminder per user per pass
    }
  }
}

async function processStreakRisk(users: { user_id: string; tz: string }[]) {
  for (const u of users) {
    if (localHour(u.tz) !== 20) continue;
    const today = localDate(u.tz);
    const { count } = await admin
      .from("time_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", u.user_id)
      .gte("start_time", `${today}T00:00:00`);
    if ((count ?? 0) > 0) continue;
    const { data: prof } = await admin
      .from("profiles")
      .select("last_known_streak")
      .eq("user_id", u.user_id)
      .maybeSingle();
    const streak = prof?.last_known_streak ?? 0;
    if (streak < 2) continue;
    await sendPushToUser({
      userId: u.user_id,
      kind: "streak_risk",
      vars: { streak_days: streak },
      url: "/timer",
    });
  }
}

async function processChallengeDeadlines(users: { user_id: string; tz: string }[]) {
  for (const u of users) {
    if (localHour(u.tz) !== 9) continue;
    const { data: prog } = await admin
      .from("room_challenge_progress")
      .select("challenge_id, room_challenges!inner(id,name,end_date,room_id,goal_seconds)")
      .eq("user_id", u.user_id);
    if (!prog) continue;
    for (const p of prog as any[]) {
      const ch = p.room_challenges;
      if (!ch?.end_date) continue;
      const endsMs = new Date(ch.end_date).getTime() - Date.now();
      const hoursLeft = Math.round(endsMs / 3600000);
      if (hoursLeft < 1 || hoursLeft > 24) continue;
      await sendPushToUser({
        userId: u.user_id,
        kind: "room_challenge_deadline",
        vars: { challenge_name: ch.name, hours_left: hoursLeft },
        url: `/rooms/${ch.room_id}`,
      });
      break;
    }
  }
}

async function processReEngagement(users: { user_id: string; tz: string }[]) {
  for (const u of users) {
    if (localHour(u.tz) !== 11) continue;
    if (localWeekday(u.tz) !== 6) continue; // saturday
    const { data: last } = await admin
      .from("time_entries")
      .select("start_time")
      .eq("user_id", u.user_id)
      .order("start_time", { ascending: false })
      .limit(1);
    const lastTime = last?.[0]?.start_time;
    if (!lastTime) continue;
    const daysAway = Math.floor((Date.now() - new Date(lastTime).getTime()) / 86400000);
    if (![3, 7, 14].includes(daysAway)) continue;
    await sendPushToUser({
      userId: u.user_id,
      kind: "re_engagement",
      vars: { days: daysAway },
      url: "/dashboard",
    });
  }
}

async function cleanupDeadSubscriptions(): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data, error } = await admin
    .from("push_subscriptions")
    .delete()
    .gte("failure_count", 5)
    .lt("last_error_at", cutoff)
    .select("id");
  if (error) {
    console.warn("[cleanup] failed", error.message);
    return 0;
  }
  return data?.length ?? 0;
}

Deno.serve(async (_req) => {
  try {
    const users = await eligibleUsers();
    const [, , , , cleaned] = await Promise.all([
      processRoomGoalReminders(users),
      processStreakRisk(users),
      processChallengeDeadlines(users),
      processReEngagement(users),
      cleanupDeadSubscriptions(),
    ]);
    return new Response(JSON.stringify({ ok: true, users: users.length, cleaned }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
