import { Bike, Footprints, Mountain, PersonStanding } from "lucide-react";

export type ActivityType = "run" | "walk" | "ride" | "hike";

export const ACTIVITY_TYPES: ActivityType[] = ["run", "walk", "ride", "hike"];

export const ACTIVITY_ICONS: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  run: Footprints,
  walk: PersonStanding,
  ride: Bike,
  hike: Mountain,
};

/** Pedal usa velocidade média; as demais modalidades usam ritmo por km. */
export function isSpeedBased(type: ActivityType | string | null | undefined): boolean {
  return type === "ride";
}

export function normalizeActivityType(value: string | null | undefined): ActivityType {
  return ACTIVITY_TYPES.includes(value as ActivityType) ? (value as ActivityType) : "run";
}

export function activityLabelKey(type: ActivityType | string | null | undefined): string {
  return `runs.type_${normalizeActivityType(type)}`;
}

/** Converte ritmo (s/km) em velocidade média (km/h). */
export function speedFromPace(secondsPerKm: number | null | undefined): number | null {
  if (!secondsPerKm || secondsPerKm <= 0) return null;
  return 3600 / secondsPerKm;
}

export function formatSpeed(secondsPerKm: number | null | undefined): string {
  const kmh = speedFromPace(secondsPerKm);
  if (kmh == null) return "--";
  return kmh.toFixed(1);
}
