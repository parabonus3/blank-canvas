export const ROUTINE_EMOJIS = [
  "🎯", "📚", "✍️", "💻", "🧠", "📖", "🗂️", "📝",
  "🌅", "🌙", "☀️", "☕", "🏃", "🏋️", "🧘", "🚴",
  "🎧", "🎨", "🎹", "🔬", "💼", "📈", "🌱", "⭐",
];

/** Semantic tokens only; stored as keys so theming stays in CSS. */
export const ROUTINE_COLORS = {
  primary: { ring: "border-primary/60", dot: "bg-primary" },
  accent: { ring: "border-accent", dot: "bg-accent" },
  secondary: { ring: "border-secondary-foreground/40", dot: "bg-secondary-foreground" },
  info: { ring: "border-muted-foreground/50", dot: "bg-muted-foreground" },
} as const;

export type RoutineColorKey = keyof typeof ROUTINE_COLORS;

export function routineColor(key: string | null | undefined) {
  return ROUTINE_COLORS[(key as RoutineColorKey) in ROUTINE_COLORS ? (key as RoutineColorKey) : "primary"];
}

export const STATUS_STYLES = {
  done: { card: "border-success bg-success/5", dot: "bg-success" },
  partial: { card: "border-warning bg-warning/5", dot: "bg-warning" },
  missed: { card: "border-destructive bg-destructive/5", dot: "bg-destructive" },
  pending: { card: "", dot: "bg-muted-foreground/40" },
  none: { card: "", dot: "bg-muted" },
} as const;
