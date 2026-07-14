// Single source of truth for member tier titles based on total_seconds in a room.
// Used by RoomChallengesMatrix, RoomMemberGrid and MemberProfileModal.

export interface LevelDef {
  key: string; // i18n key (rooms.level_*)
  minHours: number;
  color: string; // tailwind text color class
  icon: string; // emoji for modal
}

// Ascending by minHours. Last entry is the max tier.
export const ROOM_MEMBER_LEVELS: LevelDef[] = [
  { key: "rooms.level_novice", minHours: 0, color: "text-muted-foreground", icon: "🌱" },
  { key: "rooms.level_starter", minHours: 0.5, color: "text-orange-400", icon: "✨" },
  { key: "rooms.level_regular", minHours: 3, color: "text-cyan-500", icon: "🔁" },
  { key: "rooms.level_dedicated", minHours: 10, color: "text-green-500", icon: "📚" },
  { key: "rooms.level_veteran", minHours: 30, color: "text-blue-500", icon: "⚔️" },
  { key: "rooms.level_master", minHours: 80, color: "text-purple-500", icon: "🥇" },
  { key: "rooms.level_legend", minHours: 200, color: "text-yellow-500", icon: "👑" },
];

export function getLevelIndex(totalSeconds: number): number {
  const hours = Math.max(0, totalSeconds) / 3600;
  let idx = 0;
  for (let i = 0; i < ROOM_MEMBER_LEVELS.length; i++) {
    if (hours >= ROOM_MEMBER_LEVELS[i].minHours) idx = i;
  }
  return idx;
}

export interface MemberLevelProgress {
  current: LevelDef;
  next: LevelDef | null; // null when at max tier
  isMax: boolean;
  secondsToNext: number; // 0 when max
  percentToNext: number; // 0-100 within current band
}

export function getMemberLevelProgress(totalSeconds: number): MemberLevelProgress {
  const idx = getLevelIndex(totalSeconds);
  const current = ROOM_MEMBER_LEVELS[idx];
  const next = ROOM_MEMBER_LEVELS[idx + 1] ?? null;
  if (!next) {
    return { current, next: null, isMax: true, secondsToNext: 0, percentToNext: 100 };
  }
  const startSec = current.minHours * 3600;
  const endSec = next.minHours * 3600;
  const span = Math.max(1, endSec - startSec);
  const done = Math.max(0, Math.min(span, totalSeconds - startSec));
  const secondsToNext = Math.max(0, endSec - totalSeconds);
  const percentToNext = Math.round((done / span) * 100);
  return { current, next, isMax: false, secondsToNext, percentToNext };
}

/**
 * Compact duration formatter for "time to next level" hints.
 * Examples: 5400 -> "1h 30m"; 2400 -> "40m"; 90 -> "2m".
 */
export function formatShortDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.max(1, Math.ceil((s - h * 3600) / 60)); // never show 0m if there is time left
  if (h === 0) return `${m}m`;
  // when hours present and minutes rounded to 60, promote
  if (m === 60) return `${h + 1}h`;
  return `${h}h ${m}m`;
}

/** Bar color (bg-*) matching the current level text color. */
export function levelBarBgColor(current: LevelDef): string {
  switch (current.color) {
    case "text-muted-foreground":
      return "bg-muted-foreground/60";
    case "text-orange-400":
      return "bg-orange-400";
    case "text-cyan-500":
      return "bg-cyan-500";
    case "text-green-500":
      return "bg-green-500";
    case "text-blue-500":
      return "bg-blue-500";
    case "text-purple-500":
      return "bg-purple-500";
    case "text-yellow-500":
      return "bg-yellow-500";
    default:
      return "bg-primary";
  }
}
