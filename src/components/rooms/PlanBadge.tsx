import { cn } from "@/lib/utils";
import { Crown, Zap } from "lucide-react";
import { AvatarFlair } from "@/components/avatar/AvatarFlair";

interface PlanBadgeProps {
  tier: string;
  size?: "sm" | "md";
  className?: string;
}

export function PlanBadge({ tier, size = "sm", className }: PlanBadgeProps) {
  if (tier === "free" || !tier) return null;

  const isMd = size === "md";

  if (tier === "premium") {
    return (
      <span className={cn(
        "inline-flex items-center gap-0.5 font-bold uppercase tracking-wider",
        "bg-gradient-to-r from-amber-500 to-yellow-400 bg-clip-text text-transparent",
        isMd ? "text-xs" : "text-[9px]",
        className
      )}>
        <Crown className={cn("shrink-0 text-amber-500", isMd ? "h-3.5 w-3.5" : "h-2.5 w-2.5")} />
        Premium
      </span>
    );
  }

  if (tier === "pro") {
    return (
      <span className={cn(
        "inline-flex items-center gap-0.5 font-bold uppercase tracking-wider",
        "bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent",
        isMd ? "text-xs" : "text-[9px]",
        className
      )}>
        <Zap className={cn("shrink-0 text-blue-500", isMd ? "h-3.5 w-3.5" : "h-2.5 w-2.5")} />
        Pro
      </span>
    );
  }

  return null;
}

interface PlanAvatarRingProps {
  tier: string;
  flairId?: string | null;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}

/**
 * Backward-compatible wrapper that delegates to the new AvatarFlair system.
 * Callers that don't pass `flairId` get the tier's default flair.
 */
export function PlanAvatarRing({ tier, flairId, children, className, compact }: PlanAvatarRingProps) {
  return (
    <AvatarFlair tier={tier} flairId={flairId} className={className} compact={compact}>
      {children}
    </AvatarFlair>
  );
}
