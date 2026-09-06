import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { GeoPoint } from "@/lib/geo";
import type { GpsRunSummary } from "@/hooks/useGpsTracker";

export interface GpsActivity {
  id: string;
  user_id: string;
  time_entry_id: string | null;
  project_id: string | null;
  started_at: string;
  ended_at: string | null;
  distance_meters: number;
  moving_seconds: number;
  elapsed_seconds: number;
  avg_pace_seconds_per_km: number | null;
  elevation_gain_meters: number;
  max_speed: number | null;
  points: GeoPoint[];
  bounds: [[number, number], [number, number]] | null;
  source: string;
  created_at: string;
  project?: { id: string; name: string; color: string | null } | null;
}

export function useGpsActivities() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["gpsActivities", user?.id],
    queryFn: async () => {
      if (!user) return [] as GpsActivity[];
      const { data, error } = await (supabase as any)
        .from("gps_activities")
        .select("*, project:projects(id, name, color)")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data || []) as GpsActivity[];
    },
    enabled: !!user,
  });
}

export interface GpsRecord {
  activity_type: string;
  total_activities: number;
  total_distance_meters: number;
  longest_distance_meters: number;
  best_pace_seconds_per_km: number | null;
  max_speed: number | null;
}

/** Recordes pessoais por modalidade (RPC no banco). */
export function useGpsRecords() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["gpsRecords", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_gps_records");
      if (error) throw error;
      return (data || []) as GpsRecord[];
    },
    enabled: !!user,
  });
}

export function useSaveGpsActivity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      summary,
      timeEntryId,
      projectId,
      activityType,
    }: {
      summary: GpsRunSummary;
      timeEntryId?: string | null;
      projectId?: string | null;
      activityType?: string | null;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await (supabase as any)
        .from("gps_activities")
        .insert({
          user_id: user.id,
          time_entry_id: timeEntryId ?? null,
          project_id: projectId ?? null,
          started_at: summary.startedAt,
          ended_at: summary.endedAt,
          distance_meters: summary.distanceMeters,
          moving_seconds: summary.movingSeconds,
          elapsed_seconds: summary.elapsedSeconds,
          avg_pace_seconds_per_km: summary.avgPaceSecondsPerKm,
          elevation_gain_meters: summary.elevationGainMeters,
          max_speed: summary.maxSpeed,
          points: summary.points,
          bounds: summary.bounds,
          source: "browser",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as GpsActivity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gpsActivities"] });
    },
  });
}

export function useDeleteGpsActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("gps_activities").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gpsActivities"] });
    },
  });
}

export interface GpsTotals {
  monthMeters: number;
  yearMeters: number;
  longestMeters: number;
  bestPace: number | null;
  count: number;
}

export function computeTotals(activities: GpsActivity[]): GpsTotals {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  let monthMeters = 0;
  let yearMeters = 0;
  let longestMeters = 0;
  let bestPace: number | null = null;

  for (const a of activities) {
    const d = new Date(a.started_at);
    const meters = Number(a.distance_meters || 0);
    if (d.getFullYear() === year) {
      yearMeters += meters;
      if (d.getMonth() === month) monthMeters += meters;
    }
    if (meters > longestMeters) longestMeters = meters;
    const pace = a.avg_pace_seconds_per_km ? Number(a.avg_pace_seconds_per_km) : null;
    if (pace && meters >= 500 && (bestPace == null || pace < bestPace)) bestPace = pace;
  }

  return { monthMeters, yearMeters, longestMeters, bestPace, count: activities.length };
}
