import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimezone } from "@/hooks/useTimezone";
import { shiftKey, todayKeyFor, type RoutineRunRow } from "@/lib/routineStatus";

export type RoutineStepKind = "focus" | "break";

export interface RoutineStep {
  id: string;
  kind: RoutineStepKind;
  title: string;
  minutes: number;
  projectId?: string | null;
  checklistId?: string | null;
}

export interface FocusRoutine {
  id: string;
  user_id: string;
  title: string;
  emoji: string | null;
  color: string | null;
  weekdays: number[];
  goal_id: string | null;
  steps: RoutineStep[];
  position: number;
  created_at: string;
  updated_at: string;
}

export function newStepId() {
  return Math.random().toString(36).slice(2, 10);
}

function parseSteps(raw: unknown): RoutineStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s === "object")
    .map((s: any) => ({
      id: typeof s.id === "string" ? s.id : newStepId(),
      kind: s.kind === "break" ? "break" : "focus",
      title: typeof s.title === "string" ? s.title : "",
      minutes: Number.isFinite(Number(s.minutes)) ? Math.max(1, Math.floor(Number(s.minutes))) : 25,
      projectId: s.projectId ?? null,
      checklistId: typeof s.checklistId === "string" ? s.checklistId : null,
    }));
}

export function routineTotalMinutes(steps: RoutineStep[]) {
  return steps.reduce((acc, s) => acc + (s.minutes || 0), 0);
}

export function useFocusRoutines() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["focusRoutines", user?.id],
    queryFn: async () => {
      if (!user) return [] as FocusRoutine[];
      const { data, error } = await (supabase as any)
        .from("focus_routines")
        .select("*")
        .eq("user_id", user.id)
        .order("position", { ascending: true });
      if (error) throw error;
      return ((data || []) as any[]).map((r) => ({
        ...r,
        color: r.color ?? null,
        weekdays: Array.isArray(r.weekdays) ? r.weekdays : [],
        goal_id: r.goal_id ?? null,
        steps: parseSteps(r.steps),
      })) as FocusRoutine[];
    },
    enabled: !!user,
  });
}

export function useSaveFocusRoutine() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id?: string;
      title: string;
      emoji?: string | null;
      color?: string | null;
      weekdays?: number[];
      goal_id?: string | null;
      steps: RoutineStep[];
      position?: number;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const payload = {
        user_id: user.id,
        title: input.title,
        emoji: input.emoji ?? null,
        color: input.color ?? null,
        weekdays: input.weekdays ?? [],
        goal_id: input.goal_id ?? null,
        steps: input.steps as any,
        position: input.position ?? 0,
      };
      if (input.id) {
        const { data, error } = await (supabase as any)
          .from("focus_routines")
          .update({
            title: payload.title,
            emoji: payload.emoji,
            color: payload.color,
            weekdays: payload.weekdays,
            goal_id: payload.goal_id,
            steps: payload.steps,
          })
          .eq("id", input.id)
          .select("*")
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await (supabase as any)
        .from("focus_routines")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["focusRoutines"] });
    },
  });
}

export function useDeleteFocusRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("focus_routines").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["focusRoutines"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Histórico de execuções (status do dia, no fuso do perfil)           */
/* ------------------------------------------------------------------ */

export function useRoutineRuns(days = 14) {
  const { user } = useAuth();
  const { timezone } = useTimezone();
  const todayKey = todayKeyFor(timezone);
  const fromKey = shiftKey(todayKey, -(days - 1));
  return useQuery({
    queryKey: ["focusRoutineRuns", user?.id, fromKey],
    queryFn: async () => {
      if (!user) return [] as RoutineRunRow[];
      const { data, error } = await (supabase as any)
        .from("focus_routine_runs")
        .select("routine_id, local_date, status, steps_done, steps_skipped, ended_at")
        .eq("user_id", user.id)
        .gte("local_date", fromKey)
        .order("started_at", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return (data || []) as RoutineRunRow[];
    },
    enabled: !!user,
  });
}

/* ------------------------------------------------------------------ */
/* Execução local da rotina (sobrevive a refresh)                      */
/* ------------------------------------------------------------------ */

const RUN_KEY = "timezoni.routineRun";

export interface RoutineRunState {
  routineId: string;
  runRowId?: string | null;
  title: string;
  emoji: string | null;
  steps: RoutineStep[];
  index: number;
  /** Passos concluídos (ids). */
  done: string[];
  skipped?: string[];
  startedAt: number;
}

function readRun(): RoutineRunState | null {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.steps)) return null;
    return {
      routineId: String(parsed.routineId || ""),
      runRowId: typeof parsed.runRowId === "string" ? parsed.runRowId : null,
      title: String(parsed.title || ""),
      emoji: parsed.emoji ?? null,
      steps: parseSteps(parsed.steps),
      index: Number.isFinite(Number(parsed.index)) ? Number(parsed.index) : 0,
      done: Array.isArray(parsed.done) ? parsed.done.map(String) : [],
      skipped: Array.isArray(parsed.skipped) ? parsed.skipped.map(String) : [],
      startedAt: Number(parsed.startedAt) || Date.now(),
    };
  } catch {
    return null;
  }
}

/** Controla a rotina em execução no cliente, sem interferir no cronômetro. */
export function useRoutineRun() {
  const { user } = useAuth();
  const { timezone } = useTimezone();
  const queryClient = useQueryClient();
  const [run, setRun] = useState<RoutineRunState | null>(() => readRun());
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    try {
      if (run) localStorage.setItem(RUN_KEY, JSON.stringify(run));
      else localStorage.removeItem(RUN_KEY);
    } catch {}
  }, [run]);

  const persist = useCallback(
    async (state: RoutineRunState, status: "started" | "completed" | "partial") => {
      if (!user || !state.runRowId) return;
      const ended = status !== "started";
      await (supabase as any)
        .from("focus_routine_runs")
        .update({
          status,
          steps_done: state.done.length,
          steps_skipped: state.skipped?.length ?? 0,
          ended_at: ended ? new Date().toISOString() : null,
        })
        .eq("id", state.runRowId);
      queryClient.invalidateQueries({ queryKey: ["focusRoutineRuns"] });
    },
    [user, queryClient],
  );

  const start = useCallback(
    (routine: FocusRoutine) => {
      if (!routine.steps.length) return;
      const runRowId = crypto.randomUUID();
      setRun({
        routineId: routine.id,
        runRowId: user ? runRowId : null,
        title: routine.title,
        emoji: routine.emoji,
        steps: routine.steps,
        index: 0,
        done: [],
        skipped: [],
        startedAt: Date.now(),
      });
      if (user) {
        void (supabase as any)
          .from("focus_routine_runs")
          .insert({
            id: runRowId,
            user_id: user.id,
            routine_id: routine.id,
            local_date: todayKeyFor(timezone),
            status: "started",
            steps_total: routine.steps.length,
          })
          .then(() => queryClient.invalidateQueries({ queryKey: ["focusRoutineRuns"] }));
      }
    },
    [user, timezone, queryClient],
  );

  const advance = useCallback(
    (mark: "done" | "skipped") => {
      const prev = runRef.current;
      if (!prev) return;
      const current = prev.steps[prev.index];
      const done = mark === "done" && current && !prev.done.includes(current.id) ? [...prev.done, current.id] : prev.done;
      const skipped = mark === "skipped" && current ? [...(prev.skipped ?? []), current.id] : prev.skipped ?? [];
      const next = prev.index + 1;
      const updated = { ...prev, index: next, done, skipped };
      if (next >= prev.steps.length) {
        void persist(updated, skipped.length === 0 ? "completed" : "partial");
        setRun(null);
      } else {
        void persist(updated, "started");
        setRun(updated);
      }
    },
    [persist],
  );

  const stop = useCallback(() => {
    const prev = runRef.current;
    if (prev) void persist(prev, "partial");
    setRun(null);
  }, [persist]);

  const completeCurrent = useCallback(() => advance("done"), [advance]);
  const skipCurrent = useCallback(() => advance("skipped"), [advance]);

  const currentStep = run ? run.steps[run.index] ?? null : null;

  return { run, currentStep, start, stop, completeCurrent, skipCurrent };
}
