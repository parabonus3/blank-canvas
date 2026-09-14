import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SeedLocaleStats {
  locale: string;
  users: number;
  rooms: number;
  target_rooms: number;
  members: number;
  with_history: number;
  online: number;
}

export interface SeedStats {
  users: number;
  rooms: number;
  target_rooms: number;
  sessions: number;
  presence_enabled: boolean;
  locales: SeedLocaleStats[];
}

async function callSeed(action: string, payload?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("seed-admin", { body: { action, payload } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useSeedStats() {
  return useQuery<SeedStats>({ queryKey: ["seed-stats"], queryFn: () => callSeed("stats"), staleTime: 15_000 });
}

export function useSeedAction() {
  const client = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ action, payload }: { action: string; payload?: Record<string, unknown> }) => callSeed(action, payload),
    onSuccess: () => client.invalidateQueries({ queryKey: ["seed-stats"] }),
    onError: (error: Error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });
}