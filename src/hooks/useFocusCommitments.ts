import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Metas de foco disponíveis no modo Deep Work (minutos). */
export const DEEP_WORK_TARGETS = [25, 50, 90] as const;

/** Motivos possíveis quando a pessoa para antes de bater a meta. */
export const INTERRUPTION_REASONS = [
  "distraction",
  "interruption",
  "urgency",
  "tired",
  "done_early",
  "other",
] as const;

export type InterruptionReason = (typeof INTERRUPTION_REASONS)[number];

export interface FocusCommitment {
  id: string;
  user_id: string;
  time_entry_id: string | null;
  project_id: string | null;
  target_minutes: number;
  achieved_seconds: number;
  completed: boolean;
  interruption_reason: string | null;
  created_at: string;
}

export function useSaveFocusCommitment() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      targetMinutes: number;
      achievedSeconds: number;
      timeEntryId?: string | null;
      projectId?: string | null;
      reason?: InterruptionReason | null;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const completed = input.achievedSeconds >= input.targetMinutes * 60;
      const { data, error } = await (supabase as any)
        .from("focus_commitments")
        .insert({
          user_id: user.id,
          time_entry_id: input.timeEntryId ?? null,
          project_id: input.projectId ?? null,
          target_minutes: input.targetMinutes,
          achieved_seconds: Math.max(0, Math.floor(input.achievedSeconds)),
          completed,
          interruption_reason: completed ? null : input.reason ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as FocusCommitment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["focusCommitments"] });
    },
  });
}

export interface FocusStats {
  total: number;
  completed: number;
  successRate: number;
  /** Motivos de interrupção ordenados do mais frequente ao menos frequente. */
  reasons: Array<{ reason: string; count: number }>;
  /** Minutos focados dentro de sessões com meta. */
  focusedMinutes: number;
}

/** Estatísticas de compromissos de foco dos últimos `days` dias. */
export function useFocusStats(days = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["focusCommitments", user?.id, days],
    queryFn: async (): Promise<FocusStats> => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from("focus_commitments")
        .select("target_minutes, achieved_seconds, completed, interruption_reason, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = (data || []) as FocusCommitment[];
      const counts = new Map<string, number>();
      let focusedSeconds = 0;
      let completed = 0;

      for (const r of rows) {
        focusedSeconds += r.achieved_seconds || 0;
        if (r.completed) completed += 1;
        else if (r.interruption_reason) {
          counts.set(r.interruption_reason, (counts.get(r.interruption_reason) || 0) + 1);
        }
      }

      return {
        total: rows.length,
        completed,
        successRate: rows.length ? Math.round((completed / rows.length) * 100) : 0,
        reasons: [...counts.entries()]
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count),
        focusedMinutes: Math.round(focusedSeconds / 60),
      };
    },
    enabled: !!user,
    staleTime: 60000,
  });
}
