import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PlanTier } from "@/lib/stripePlans";
import { resolveFlair } from "@/lib/avatarFlairs";

interface Props {
  tier: PlanTier | string | null | undefined;
  flairId?: string | null;
  children: ReactNode;
  className?: string;
  /** Disable orbital/external decorations (crown, sparkles) for tight slots like chat */
  compact?: boolean;
}

/**
 * Animated avatar "flair" inspired by Discord Nitro.
 * Free users get a passthrough.
 * Pro/Premium get the chosen effect (or tier default).
 *
 * Effects are pure CSS (keyframes in index.css) — respects prefers-reduced-motion.
 */
export function AvatarFlair({ tier, flairId, children, className, compact = false }: Props) {
  const t = (tier || "free") as PlanTier;
  if (t === "free") {
    return <div className={className}>{children}</div>;
  }

  const flair = resolveFlair(t, flairId);

  return (
    <div className={cn("relative inline-block", className)}>
      <FlairLayer flair={flair} compact={compact} />
      <div className="relative">{children}</div>
    </div>
  );
}

function FlairLayer({ flair, compact }: { flair: string; compact: boolean }) {
  switch (flair) {
    case "pro-pulse":
      return (
        <>
          <span className="absolute -inset-[4px] rounded-full bg-blue-400/30 blur-md animate-[plan-glow-pro_4s_ease-in-out_infinite] motion-reduce:animate-none pointer-events-none" />
          <span className="absolute -inset-[2.5px] rounded-full overflow-hidden pointer-events-none">
            <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#3b82f6,#06b6d4,#3b82f6,#6366f1,#3b82f6)] animate-[spin_5s_linear_infinite] motion-reduce:animate-none" />
          </span>
        </>
      );

    case "pro-orbit":
      return (
        <>
          <span className="absolute -inset-[2.5px] rounded-full bg-blue-500/40 pointer-events-none" />
          {!compact && (
            <span className="absolute -inset-[10px] pointer-events-none animate-[flair-orbit_3s_linear_infinite] motion-reduce:animate-none">
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
            </span>
          )}
        </>
      );

    case "pro-shimmer":
      return (
        <span className="absolute -inset-[3px] rounded-full overflow-hidden pointer-events-none">
          <span className="absolute inset-0 rounded-full bg-[linear-gradient(110deg,#3b82f6_30%,#22d3ee_50%,#3b82f6_70%)] bg-[length:200%_100%] animate-[flair-shimmer_2.5s_linear_infinite] motion-reduce:animate-none" />
        </span>
      );

    case "pro-wave":
      return (
        <>
          <span className="absolute -inset-[2.5px] rounded-full bg-blue-500/50 pointer-events-none" />
          {!compact && (
            <>
              <span className="absolute inset-0 rounded-full ring-2 ring-cyan-400/60 animate-[flair-wave_2s_ease-out_infinite] motion-reduce:animate-none pointer-events-none" />
              <span className="absolute inset-0 rounded-full ring-2 ring-blue-400/50 animate-[flair-wave_2s_ease-out_infinite_0.7s] motion-reduce:animate-none pointer-events-none" />
            </>
          )}
        </>
      );

    case "premium-gold":
      return (
        <>
          <span className="absolute -inset-[5px] rounded-full bg-amber-400/30 blur-md animate-[plan-glow-premium_3s_ease-in-out_infinite] motion-reduce:animate-none pointer-events-none" />
          <span className="absolute -inset-[3px] rounded-full overflow-hidden pointer-events-none">
            <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#f59e0b,#fbbf24,#f59e0b,#d97706,#f59e0b)] animate-[spin_3s_linear_infinite] motion-reduce:animate-none" />
          </span>
        </>
      );

    case "premium-flames":
      return (
        <>
          <span className="absolute -inset-[3px] rounded-full overflow-hidden pointer-events-none">
            <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#f97316,#fbbf24,#ef4444,#f59e0b,#f97316)] animate-[spin_2.5s_linear_infinite] motion-reduce:animate-none" />
          </span>
          {!compact && (
            <>
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-base animate-[flair-flame_1.4s_ease-in-out_infinite] motion-reduce:animate-none pointer-events-none">🔥</span>
              <span className="absolute -top-1 -left-1 text-xs animate-[flair-flame_1.6s_ease-in-out_infinite_0.3s] motion-reduce:animate-none pointer-events-none">🔥</span>
              <span className="absolute -top-1 -right-1 text-xs animate-[flair-flame_1.5s_ease-in-out_infinite_0.5s] motion-reduce:animate-none pointer-events-none">🔥</span>
            </>
          )}
        </>
      );

    case "premium-sparkles":
      return (
        <>
          <span className="absolute -inset-[3px] rounded-full bg-[conic-gradient(from_0deg,#fde68a,#f59e0b,#fde68a)] animate-[spin_4s_linear_infinite] motion-reduce:animate-none pointer-events-none" />
          {!compact && (
            <span className="absolute -inset-[10px] pointer-events-none animate-[spin_6s_linear_infinite] motion-reduce:animate-none">
              <span className="absolute top-0 left-1/2 -translate-x-1/2 text-amber-300 text-[10px]">✦</span>
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-amber-300 text-[10px]">✦</span>
              <span className="absolute top-1/2 -left-1 -translate-y-1/2 text-yellow-300 text-[10px]">✧</span>
              <span className="absolute top-1/2 -right-1 -translate-y-1/2 text-yellow-300 text-[10px]">✧</span>
            </span>
          )}
        </>
      );

    case "premium-rainbow":
      return (
        <>
          <span className="absolute -inset-[5px] rounded-full bg-pink-400/20 blur-md animate-pulse motion-reduce:animate-none pointer-events-none" />
          <span className="absolute -inset-[3px] rounded-full overflow-hidden pointer-events-none">
            <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#ef4444,#f59e0b,#eab308,#22c55e,#06b6d4,#3b82f6,#a855f7,#ec4899,#ef4444)] animate-[spin_4s_linear_infinite] motion-reduce:animate-none" />
          </span>
        </>
      );

    case "premium-aurora":
      return (
        <>
          <span className="absolute -inset-[6px] rounded-full bg-emerald-400/20 blur-lg animate-[flair-aurora_5s_ease-in-out_infinite] motion-reduce:animate-none pointer-events-none" />
          <span className="absolute -inset-[3px] rounded-full overflow-hidden pointer-events-none">
            <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#10b981,#06b6d4,#a855f7,#ec4899,#10b981)] animate-[spin_6s_linear_infinite] motion-reduce:animate-none" />
          </span>
        </>
      );

    case "premium-crown":
      return (
        <>
          <span className="absolute -inset-[4px] rounded-full bg-amber-400/30 blur-md animate-[plan-glow-premium_3s_ease-in-out_infinite] motion-reduce:animate-none pointer-events-none" />
          <span className="absolute -inset-[2.5px] rounded-full overflow-hidden pointer-events-none">
            <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#fbbf24,#f59e0b,#d97706,#fbbf24)] animate-[spin_4s_linear_infinite] motion-reduce:animate-none" />
          </span>
          {!compact && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-base drop-shadow-[0_0_4px_rgba(251,191,36,0.9)] animate-[flair-float_2.5s_ease-in-out_infinite] motion-reduce:animate-none pointer-events-none">
              👑
            </span>
          )}
        </>
      );

    case "premium-galaxy":
      return (
        <>
          <span className="absolute -inset-[5px] rounded-full bg-purple-500/30 blur-md animate-pulse motion-reduce:animate-none pointer-events-none" />
          <span className="absolute -inset-[3px] rounded-full overflow-hidden pointer-events-none">
            <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#a855f7,#3b82f6,#a855f7,#ec4899,#a855f7)] animate-[spin_5s_linear_infinite] motion-reduce:animate-none" />
          </span>
          {!compact && (
            <>
              <span className="absolute -inset-[12px] pointer-events-none animate-[spin_8s_linear_infinite] motion-reduce:animate-none">
                <span className="absolute top-0 left-1/2 w-1 h-1 rounded-full bg-white shadow-[0_0_6px_white]" />
                <span className="absolute bottom-2 right-0 w-0.5 h-0.5 rounded-full bg-purple-200 shadow-[0_0_4px_#e9d5ff]" />
                <span className="absolute top-3 left-0 w-0.5 h-0.5 rounded-full bg-blue-200 shadow-[0_0_4px_#bfdbfe]" />
              </span>
              <span className="absolute -inset-[14px] pointer-events-none animate-[spin_12s_linear_infinite_reverse] motion-reduce:animate-none">
                <span className="absolute top-1/2 left-0 w-1 h-1 rounded-full bg-pink-300 shadow-[0_0_5px_#fbcfe8]" />
              </span>
            </>
          )}
        </>
      );

    default:
      return null;
  }
}

/** Backward-compat shim — legacy callers still use this name. */
export function PlanAvatarFlair(props: Props) {
  return <AvatarFlair {...props} />;
}
