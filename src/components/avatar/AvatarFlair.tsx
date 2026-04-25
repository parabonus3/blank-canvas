import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PlanTier } from "@/lib/stripePlans";
import { resolveFlair } from "@/lib/avatarFlairs";

interface Props {
  tier: PlanTier | string | null | undefined;
  flairId?: string | null;
  children: ReactNode;
  className?: string;
  /** Disable orbital/external decorations for tight slots like chat */
  compact?: boolean;
}

/**
 * Animated avatar "flair" — pure CSS, no emoji.
 * Free users get a passthrough.
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
    /* ===== Pro · Clássicos ===== */
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

    /* ===== Dark ===== */
    case "pro-noir":
      return (
        <>
          <span className="absolute -inset-[3px] rounded-full bg-zinc-950 pointer-events-none" />
          <span className="absolute -inset-[3px] rounded-full overflow-hidden pointer-events-none">
            <span
              className="absolute inset-0 rounded-full bg-[linear-gradient(110deg,#0a0a0a_40%,#22d3ee_50%,#0a0a0a_60%)] bg-[length:200%_100%] animate-[silver-sweep_3s_linear_infinite] motion-reduce:animate-none"
            />
          </span>
        </>
      );

    case "premium-obsidian":
      return (
        <>
          <span className="absolute -inset-[5px] rounded-full bg-black/60 blur-md pointer-events-none" />
          <span className="absolute -inset-[3px] rounded-full overflow-hidden pointer-events-none">
            <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#000,#3f3f46,#a1a1aa,#3f3f46,#000,#52525b,#000)] animate-[spin_6s_linear_infinite] motion-reduce:animate-none" />
          </span>
          <span className="absolute -inset-[3px] rounded-full overflow-hidden pointer-events-none">
            <span className="absolute inset-0 rounded-full bg-[linear-gradient(110deg,transparent_40%,rgba(255,255,255,0.4)_50%,transparent_60%)] bg-[length:200%_100%] animate-[silver-sweep_4s_linear_infinite] motion-reduce:animate-none" />
          </span>
        </>
      );

    case "premium-void":
      return (
        <>
          <span className="absolute -inset-[5px] rounded-full bg-purple-900/30 blur-lg animate-[void-pulse_3s_ease-in-out_infinite] motion-reduce:animate-none pointer-events-none" />
          <span className="absolute -inset-[3px] rounded-full overflow-hidden pointer-events-none">
            <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#000,#1e1b4b,#000,#3b0764,#000)] animate-[spin_7s_linear_infinite] motion-reduce:animate-none" />
          </span>
          {!compact && (
            <span className="absolute -inset-[10px] pointer-events-none animate-[spin_9s_linear_infinite_reverse] motion-reduce:animate-none">
              <span className="absolute top-1 left-1/2 w-1 h-1 rounded-full bg-purple-400 shadow-[0_0_6px_#a855f7]" />
              <span className="absolute bottom-2 right-1 w-0.5 h-0.5 rounded-full bg-indigo-300 shadow-[0_0_4px_#a5b4fc]" />
              <span className="absolute top-1/2 -left-0.5 w-0.5 h-0.5 rounded-full bg-violet-300 shadow-[0_0_4px_#ddd6fe]" />
            </span>
          )}
        </>
      );

    /* ===== Femininos ===== */
    case "pro-blossom":
      return (
        <>
          <span className="absolute -inset-[5px] rounded-full bg-pink-300/30 blur-md animate-pulse motion-reduce:animate-none pointer-events-none" />
          <span className="absolute -inset-[3px] rounded-full overflow-hidden pointer-events-none">
            <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#f9a8d4,#c4b5fd,#f9a8d4,#fbcfe8,#f9a8d4)] animate-[spin_6s_linear_infinite] motion-reduce:animate-none" />
          </span>
        </>
      );

    case "premium-rose":
      return (
        <>
          <span className="absolute -inset-[5px] rounded-full bg-rose-300/30 blur-md animate-pulse motion-reduce:animate-none pointer-events-none" />
          <span className="absolute -inset-[3px] rounded-full overflow-hidden pointer-events-none">
            <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#fda4af,#fbbf24,#f9a8d4,#fb7185,#fda4af)] animate-[spin_5s_linear_infinite] motion-reduce:animate-none" />
          </span>
          {!compact && (
            <>
              <span
                className="absolute -top-1 left-1/2 w-2 h-3 bg-gradient-to-b from-rose-300 to-pink-400 pointer-events-none animate-[petal-float_3s_ease-out_infinite] motion-reduce:animate-none"
                style={{ borderRadius: "100% 0 100% 0", ["--tx" as any]: "10px", ["--ty" as any]: "-20px" }}
              />
              <span
                className="absolute -top-1 left-1 w-1.5 h-2.5 bg-gradient-to-b from-amber-200 to-rose-300 pointer-events-none animate-[petal-float_3.5s_ease-out_infinite_0.6s] motion-reduce:animate-none"
                style={{ borderRadius: "100% 0 100% 0", ["--tx" as any]: "-8px", ["--ty" as any]: "-22px" }}
              />
              <span
                className="absolute top-0 right-1 w-1.5 h-2.5 bg-gradient-to-b from-pink-200 to-rose-400 pointer-events-none animate-[petal-float_3.2s_ease-out_infinite_1.2s] motion-reduce:animate-none"
                style={{ borderRadius: "100% 0 100% 0", ["--tx" as any]: "12px", ["--ty" as any]: "-18px" }}
              />
            </>
          )}
        </>
      );

    case "premium-pearl":
      return (
        <>
          <span className="absolute -inset-[5px] rounded-full bg-pink-100/40 blur-md animate-[pearl-shimmer_4s_ease-in-out_infinite] motion-reduce:animate-none pointer-events-none" />
          <span className="absolute -inset-[3px] rounded-full overflow-hidden pointer-events-none">
            <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#fce7f3,#dbeafe,#fef3c7,#fce7f3,#e0e7ff,#fce7f3)] animate-[spin_8s_linear_infinite] motion-reduce:animate-none" />
          </span>
          <span className="absolute -inset-[3px] rounded-full overflow-hidden pointer-events-none">
            <span className="absolute inset-0 rounded-full bg-[linear-gradient(110deg,transparent_40%,rgba(255,255,255,0.6)_50%,transparent_60%)] bg-[length:200%_100%] animate-[silver-sweep_3.5s_linear_infinite] motion-reduce:animate-none" />
          </span>
        </>
      );

    case "premium-butterfly":
      return (
        <>
          <span className="absolute -inset-[4px] rounded-full bg-pink-300/30 blur-md animate-pulse motion-reduce:animate-none pointer-events-none" />
          <span className="absolute -inset-[3px] rounded-full overflow-hidden pointer-events-none">
            <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#f9a8d4,#c084fc,#f472b6,#a855f7,#f9a8d4)] animate-[spin_5s_linear_infinite] motion-reduce:animate-none" />
          </span>
          {!compact && (
            <>
              <span
                className="absolute top-1/2 -left-2 w-3 h-4 bg-gradient-to-br from-pink-400 to-purple-500 pointer-events-none origin-right animate-[wing-flap_0.6s_ease-in-out_infinite] motion-reduce:animate-none"
                style={{ clipPath: "polygon(100% 0, 100% 100%, 0 80%, 20% 50%, 0 20%)", transformOrigin: "right center" }}
              />
              <span
                className="absolute top-1/2 -right-2 w-3 h-4 bg-gradient-to-bl from-pink-400 to-purple-500 pointer-events-none origin-left animate-[wing-flap-right_0.6s_ease-in-out_infinite] motion-reduce:animate-none"
                style={{ clipPath: "polygon(0 0, 0 100%, 100% 80%, 80% 50%, 100% 20%)", transformOrigin: "left center" }}
              />
            </>
          )}
        </>
      );

    /* ===== Especiais ===== */
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
      // Círculo de fogo puro CSS — sem emoji
      return (
        <>
          {/* halo externo flicker */}
          <span className="absolute -inset-[8px] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.5)_0%,rgba(239,68,68,0.3)_45%,transparent_70%)] animate-[flame-flicker_1.2s_ease-in-out_infinite] motion-reduce:animate-none pointer-events-none" />
          <span className="absolute -inset-[6px] rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.6)_0%,rgba(249,115,22,0.4)_50%,transparent_75%)] animate-[flame-flicker_0.9s_ease-in-out_infinite_0.3s] motion-reduce:animate-none pointer-events-none" />
          {/* anel rotativo de fogo */}
          <span className="absolute -inset-[3px] rounded-full overflow-hidden pointer-events-none">
            <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#f97316,#fbbf24,#ef4444,#f59e0b,#dc2626,#f97316)] animate-[flame-rotate_3s_linear_infinite] motion-reduce:animate-none" />
          </span>
          {/* línguas de fogo internas (mascaradas em forma de chamas via blur+glow) */}
          {!compact && (
            <span className="absolute -inset-[4px] rounded-full overflow-hidden pointer-events-none mix-blend-screen">
              <span className="absolute -top-1 left-1/4 w-1.5 h-3 bg-gradient-to-t from-orange-500 to-yellow-200 blur-[2px] rounded-full animate-[flame-flicker_0.7s_ease-in-out_infinite]" />
              <span className="absolute -top-1 right-1/4 w-1.5 h-3 bg-gradient-to-t from-red-500 to-yellow-300 blur-[2px] rounded-full animate-[flame-flicker_0.9s_ease-in-out_infinite_0.4s]" />
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-4 bg-gradient-to-t from-orange-600 to-yellow-100 blur-[2px] rounded-full animate-[flame-flicker_0.6s_ease-in-out_infinite_0.2s]" />
            </span>
          )}
        </>
      );

    case "premium-sparkles":
      return (
        <>
          <span className="absolute -inset-[3px] rounded-full bg-[conic-gradient(from_0deg,#fde68a,#f59e0b,#fde68a)] animate-[spin_4s_linear_infinite] motion-reduce:animate-none pointer-events-none" />
          {!compact && (
            <span className="absolute -inset-[10px] pointer-events-none animate-[spin_6s_linear_infinite] motion-reduce:animate-none">
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-200 shadow-[0_0_6px_#fde68a]" />
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-200 shadow-[0_0_6px_#fde68a]" />
              <span className="absolute top-1/2 -left-1 -translate-y-1/2 w-0.5 h-0.5 rounded-full bg-yellow-200 shadow-[0_0_5px_#fef08a]" />
              <span className="absolute top-1/2 -right-1 -translate-y-1/2 w-0.5 h-0.5 rounded-full bg-yellow-200 shadow-[0_0_5px_#fef08a]" />
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
      // Diadema CSS sem emoji — silhueta com clip-path + brilho
      return (
        <>
          <span className="absolute -inset-[4px] rounded-full bg-amber-400/30 blur-md animate-[plan-glow-premium_3s_ease-in-out_infinite] motion-reduce:animate-none pointer-events-none" />
          <span className="absolute -inset-[2.5px] rounded-full overflow-hidden pointer-events-none">
            <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#fbbf24,#f59e0b,#d97706,#fbbf24)] animate-[spin_4s_linear_infinite] motion-reduce:animate-none" />
          </span>
          {!compact && (
            <span
              className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-7 h-3 pointer-events-none animate-[crown-shine_2s_ease-in-out_infinite] motion-reduce:animate-none"
              style={{
                background: "linear-gradient(180deg,#fde68a 0%,#fbbf24 50%,#b45309 100%)",
                clipPath:
                  "polygon(0% 100%, 0% 60%, 15% 0%, 30% 60%, 50% 0%, 70% 60%, 85% 0%, 100% 60%, 100% 100%)",
              }}
            >
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-rose-400 shadow-[0_0_3px_#fb7185]" />
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
