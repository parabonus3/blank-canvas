import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TimeBlock {
  id: string;
  user_id: string;
  task_id: string | null;
  project_id: string | null;
  time_entry_id: string | null;
  title: string;
  start_at: string;
  end_at: string;
  is_done: boolean;
  created_at: string;
  updated_at: string;
}

function dayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
}

/** Blocos de agenda de um dia (hora local do dispositivo). */
export function useTimeBlocks(date: Date) {
  const { user } = useAuth();
  const key = date.toDateString();
  return useQuery({
    queryKey: ["timeBlocks", user?.id, key],
    queryFn: async () => {
      const { start, end } = dayBounds(date);
      const { data, error } = await (supabase as any)
        .from("time_blocks")
        .select("*")
        .gte("start_at", start.toISOString())
        .lt("start_at", end.toISOString())
        .order("start_at");
      if (error) throw error;
      return (data || []) as TimeBlock[];
    },
    enabled: !!user,
  });
}

export function useCreateTimeBlock() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      start_at: string;
      end_at: string;
      task_id?: string | null;
      project_id?: string | null;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await (supabase as any)
        .from("time_blocks")
        .insert({
          user_id: user.id,
          title: input.title,
          start_at: input.start_at,
          end_at: input.end_at,
          task_id: input.task_id ?? null,
          project_id: input.project_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as TimeBlock;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timeBlocks"] }),
  });
}

export function useUpdateTimeBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<TimeBlock> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("time_blocks")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as TimeBlock;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timeBlocks"] }),
  });
}

export function useDeleteTimeBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("time_blocks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timeBlocks"] }),
  });
}

/** Tempo realmente registrado em cada bloco: sessões que se sobrepõem à janela. */
export function useBlocksActualMinutes(blocks: TimeBlock[]) {
  const { user } = useAuth();
  const ids = blocks.map((b) => b.id).join(",");
  return useQuery({
    queryKey: ["timeBlocksActual", user?.id, ids],
    queryFn: async () => {
      const map = new Map<string, number>();
      if (blocks.length === 0) return map;
      const min = blocks.reduce((a, b) => (a < b.start_at ? a : b.start_at), blocks[0].start_at);
      const max = blocks.reduce((a, b) => (a > b.end_at ? a : b.end_at), blocks[0].end_at);
      const { data, error } = await supabase
        .from("time_entries")
        .select("start_time, end_time, duration, task_id")
        .eq("user_id", user!.id)
        .not("end_time", "is", null)
        .gte("start_time", new Date(new Date(min).getTime() - 12 * 3600_000).toISOString())
        .lte("start_time", max);
      if (error) throw error;

      blocks.forEach((b) => {
        const bStart = new Date(b.start_at).getTime();
        const bEnd = new Date(b.end_at).getTime();
        let seconds = 0;
        (data || []).forEach((e: any) => {
          const s = new Date(e.start_time).getTime();
          const en = new Date(e.end_time).getTime();
          const overlap = Math.min(bEnd, en) - Math.max(bStart, s);
          if (overlap <= 0) return;
          if (b.task_id && e.task_id && e.task_id !== b.task_id) return;
          seconds += overlap / 1000;
        });
        map.set(b.id, Math.round(seconds / 60));
      });
      return map;
    },
    enabled: !!user && blocks.length > 0,
    staleTime: 30_000,
  });
}
