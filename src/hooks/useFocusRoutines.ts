import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type RoutineStepKind = "focus" | "break";

export interface RoutineStep {
  id: string;
  kind: RoutineStepKind;
  title: string;
  minutes: number;
  projectId?: string | null;
}

export interface FocusRoutine {
  id: string;
  user_id: string;
  title: string;
  emoji: string | null;
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
      return ((data || []) as any[]).map((r) => ({ ...r, steps: parseSteps(r.steps) })) as FocusRoutine[];
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
      steps: RoutineStep[];
      position?: number;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const payload = {
        user_id: user.id,
        title: input.title,
        emoji: input.emoji ?? null,
        steps: input.steps as any,
        position: input.position ?? 0,
      };
      if (input.id) {
        const { data, error } = await (supabase as any)
          .from("focus_routines")
          .update({ title: payload.title, emoji: payload.emoji, steps: payload.steps })
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
/* Execução local da rotina (sobrevive a refresh, não toca no servidor) */
/* ------------------------------------------------------------------ */

const RUN_KEY = "timezoni.routineRun";

export interface RoutineRunState {
  routineId: string;
  title: string;
  emoji: string | null;
  steps: RoutineStep[];
  index: number;
  /** Passos concluídos (ids). */
  done: string[];
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
      title: String(parsed.title || ""),
      emoji: parsed.emoji ?? null,
      steps: parseSteps(parsed.steps),
      index: Number.isFinite(Number(parsed.index)) ? Number(parsed.index) : 0,
      done: Array.isArray(parsed.done) ? parsed.done.map(String) : [],
      startedAt: Number(parsed.startedAt) || Date.now(),
    };
  } catch {
    return null;
  }
}

/** Controla a rotina em execução no cliente, sem interferir no cronômetro. */
export function useRoutineRun() {
  const [run, setRun] = useState<RoutineRunState | null>(() => readRun());

  useEffect(() => {
    try {
      if (run) localStorage.setItem(RUN_KEY, JSON.stringify(run));
      else localStorage.removeItem(RUN_KEY);
    } catch {}
  }, [run]);

  const start = useCallback((routine: FocusRoutine) => {
    if (!routine.steps.length) return;
    setRun({
      routineId: routine.id,
      title: routine.title,
      emoji: routine.emoji,
      steps: routine.steps,
      index: 0,
      done: [],
      startedAt: Date.now(),
    });
  }, []);

  const stop = useCallback(() => setRun(null), []);

  const completeCurrent = useCallback(() => {
    setRun((prev) => {
      if (!prev) return prev;
      const current = prev.steps[prev.index];
      const done = current && !prev.done.includes(current.id) ? [...prev.done, current.id] : prev.done;
      const next = prev.index + 1;
      if (next >= prev.steps.length) return null;
      return { ...prev, index: next, done };
    });
  }, []);

  const skipCurrent = useCallback(() => {
    setRun((prev) => {
      if (!prev) return prev;
      const next = prev.index + 1;
      if (next >= prev.steps.length) return null;
      return { ...prev, index: next };
    });
  }, []);

  const currentStep = run ? run.steps[run.index] ?? null : null;

  return { run, currentStep, start, stop, completeCurrent, skipCurrent };
}
