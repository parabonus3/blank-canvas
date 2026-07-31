// Hourly cron entry-point. For each user, checks local hour (from any of their
// push subscriptions' timezone) and dispatches the appropriate notification.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

async function sendPushToUser(args: {
  userId: string;
  kind: string;
  vars?: Record<string, string | number>;
  url?: string;
}): Promise<void> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        user_id: args.userId,
        kind: args.kind,
        vars: args.vars || {},
        url: args.url || "/",
      }),
    });
    const txt = await res.text();
    if (!res.ok) console.warn("[scheduler] send-push non-ok", res.status, txt.slice(0, 200));
  } catch (e) {
    console.error("[scheduler] send-push failed", e);
  }
}

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
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric", month: "2-digit", day: "2-digit", timeZone: tz,
    }).format(now);
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
    const h = localHour(u.tz);
    // Two windows: midday check (only if < 25% done) and 19h final push
    const isMidday = h === 13;
    const isEvening = h === 19;
    if (!isMidday && !isEvening) continue;
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
      const hoursDone = seconds / 3600;
      if (hoursDone >= goal) continue;
      // At midday, only nudge if user hasn't started much yet
      if (isMidday && hoursDone > goal * 0.25) continue;
      const remaining = Math.max(1, Math.ceil(goal - hoursDone));
      await sendPushToUser({
        userId: u.user_id,
        kind: "room_goal_reminder",
        vars: { room_name: r.study_rooms.name, remaining_h: remaining },
        url: `/rooms/${r.room_id}`,
      });
      break;
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
    if (streak < 1) continue; // loosened: alert even at 1 day
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
    const { data: last } = await admin
      .from("time_entries")
      .select("start_time")
      .eq("user_id", u.user_id)
      .order("start_time", { ascending: false })
      .limit(1);
    const lastTime = last?.[0]?.start_time;
    if (!lastTime) continue;
    const daysAway = Math.floor((Date.now() - new Date(lastTime).getTime()) / 86400000);
    // Loosened: any day >= 3 (dedup inside send-push prevents spam, cap 1/day)
    if (daysAway < 3 || daysAway > 60) continue;
    // Only send on Mon/Wed/Sat to avoid daily nagging
    const wd = localWeekday(u.tz);
    if (wd !== 1 && wd !== 3 && wd !== 6) continue;
    await sendPushToUser({
      userId: u.user_id,
      kind: "re_engagement",
      vars: { days: daysAway },
      url: "/dashboard",
    });
  }
}

async function processWeeklyRecap(users: { user_id: string; tz: string }[]) {
  for (const u of users) {
    // Sundays 10h local
    if (localWeekday(u.tz) !== 0 || localHour(u.tz) !== 10) continue;
    const sinceMs = Date.now() - 7 * 86400000;
    const { data: entries } = await admin
      .from("time_entries")
      .select("duration")
      .eq("user_id", u.user_id)
      .gte("start_time", new Date(sinceMs).toISOString());
    const seconds = (entries || []).reduce((s: number, e: any) => s + (e.duration || 0), 0);
    const sessions = entries?.length ?? 0;
    if (sessions === 0) continue;
    const hours = Math.round((seconds / 3600) * 10) / 10;
    await sendPushToUser({
      userId: u.user_id,
      kind: "weekly_recap",
      vars: { hours, sessions },
      url: "/dashboard",
    });
  }
}

async function processFriendActivity(users: { user_id: string; tz: string }[]) {
  for (const u of users) {
    // 20h local — daily digest of friend activity today
    if (localHour(u.tz) !== 20) continue;
    const today = localDate(u.tz);

    // Fetch accepted friend ids
    const { data: friendships } = await admin
      .from("friendships")
      .select("requester_id,addressee_id,status")
      .or(`requester_id.eq.${u.user_id},addressee_id.eq.${u.user_id}`)
      .eq("status", "accepted");
    if (!friendships || friendships.length === 0) continue;
    const friendIds = friendships.map((f: any) =>
      f.requester_id === u.user_id ? f.addressee_id : f.requester_id,
    );
    if (friendIds.length === 0) continue;

    const { data: entries } = await admin
      .from("time_entries")
      .select("user_id,duration")
      .in("user_id", friendIds)
      .gte("start_time", `${today}T00:00:00`);
    if (!entries || entries.length === 0) continue;

    // Aggregate per friend, keep only those with >= 30min
    const perFriend = new Map<string, number>();
    for (const e of entries as any[]) {
      perFriend.set(e.user_id, (perFriend.get(e.user_id) || 0) + (e.duration || 0));
    }
    const activeFriends = Array.from(perFriend.entries()).filter(([, s]) => s >= 1800);
    if (activeFriends.length === 0) continue;

    // Pick top friend by hours for headline
    activeFriends.sort((a, b) => b[1] - a[1]);
    const [topId, topSecs] = activeFriends[0];
    const { data: topProf } = await admin
      .from("profiles")
      .select("display_name")
      .eq("user_id", topId)
      .maybeSingle();
    const friendName = topProf?.display_name || "Um amigo";
    const topHours = Math.round((topSecs / 3600) * 10) / 10;

    await sendPushToUser({
      userId: u.user_id,
      kind: "friend_activity",
      vars: {
        friend_count: activeFriends.length,
        friend_name: friendName,
        hours: topHours,
      },
      url: "/friends",
    });
  }
}

/** Open (not completed) tasks the user owns or is assigned to. */
async function openTasksFor(userId: string): Promise<{ id: string; title: string; due_date: string | null }[]> {
  const { data: owned } = await admin
    .from("tasks")
    .select("id,title,due_date,is_completed")
    .eq("user_id", userId)
    .eq("is_completed", false);

  const { data: memberships } = await admin
    .from("task_members")
    .select("task_id")
    .eq("user_id", userId);
  const memberIds = (memberships || []).map((m: any) => m.task_id);

  let assigned: any[] = [];
  if (memberIds.length) {
    const { data } = await admin
      .from("tasks")
      .select("id,title,due_date,is_completed")
      .in("id", memberIds)
      .eq("is_completed", false);
    assigned = data || [];
  }

  const map = new Map<string, any>();
  [...(owned || []), ...assigned].forEach((t: any) => map.set(t.id, t));
  return Array.from(map.values());
}

async function processMorningKickoff(users: { user_id: string; tz: string }[]) {
  for (const u of users) {
    if (localHour(u.tz) !== 8) continue;
    const tasks = await openTasksFor(u.user_id);
    if (tasks.length === 0) continue;
    // Highlight the task with the nearest due date (fallback: first one)
    const withDue = tasks.filter((t) => t.due_date).sort(
      (a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime(),
    );
    const highlight = withDue[0] || tasks[0];
    await sendPushToUser({
      userId: u.user_id,
      kind: "morning_kickoff",
      vars: { task_count: tasks.length, task_title: highlight.title },
      url: "/tasks",
    });
  }
}

async function processTaskDueToday(users: { user_id: string; tz: string }[]) {
  for (const u of users) {
    if (localHour(u.tz) !== 13) continue;
    const today = localDate(u.tz);
    const tasks = await openTasksFor(u.user_id);
    const dueToday = tasks.filter((t) => t.due_date && localDate(u.tz, new Date(t.due_date)) === today);
    if (dueToday.length === 0) continue;
    await sendPushToUser({
      userId: u.user_id,
      kind: "task_due_today",
      vars: { task_count: dueToday.length, task_title: dueToday[0].title },
      url: "/tasks",
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

async function runSafe(name: string, fn: () => Promise<unknown>): Promise<string> {
  const t0 = Date.now();
  try {
    await fn();
    const ms = Date.now() - t0;
    console.info(`[scheduler] ${name} ok (${ms}ms)`);
    return `${name}:ok`;
  } catch (e: any) {
    console.error(`[scheduler] ${name} FAILED`, e?.message || e);
    return `${name}:err`;
  }
}

Deno.serve(async (_req) => {
  try {
    const users = await eligibleUsers();
    console.info("[scheduler] tick", { users: users.length, utcHour: new Date().getUTCHours() });
    const results = await Promise.all([
      runSafe("room_goal", () => processRoomGoalReminders(users)),
      runSafe("streak_risk", () => processStreakRisk(users)),
      runSafe("challenge_deadline", () => processChallengeDeadlines(users)),
      runSafe("re_engagement", () => processReEngagement(users)),
      runSafe("weekly_recap", () => processWeeklyRecap(users)),
      runSafe("friend_activity", () => processFriendActivity(users)),
    ]);
    const cleaned = await cleanupDeadSubscriptions().catch(() => 0);
    return new Response(
      JSON.stringify({ ok: true, users: users.length, cleaned, results }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[scheduler] error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
