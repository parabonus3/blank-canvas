import { cn } from "@/lib/utils";
import { Crown, Zap } from "lucide-react";

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
  children: React.ReactNode;
  className?: string;
}

/**
 * Premium: Animated golden glow halo that pulses behind the avatar.
 * Pro: Subtle blue shimmer ring.
 * Both are rendered BEHIND the avatar so they never overlap online/live indicators.
 */
export function PlanAvatarRing({ tier, children, className }: PlanAvatarRingProps) {
  if (tier === "premium") {
    return (
      <div className={cn("relative", className)}>
        {/* Outer pulsing glow */}
        <div className="absolute -inset-[5px] rounded-full animate-[plan-glow-premium_3s_ease-in-out_infinite]" />
        {/* Inner rotating gradient ring */}
        <div className="absolute -inset-[3px] rounded-full overflow-hidden">
          <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#f59e0b,#fbbf24,#f59e0b,#d97706,#f59e0b)] animate-[spin_3s_linear_infinite]" />
        </div>
        <div className="relative">
          {children}
        </div>
      </div>
    );
  }

  if (tier === "pro") {
    return (
      <div className={cn("relative", className)}>
        {/* Subtle blue glow */}
        <div className="absolute -inset-[4px] rounded-full animate-[plan-glow-pro_4s_ease-in-out_infinite]" />
        {/* Gradient ring */}
        <div className="absolute -inset-[2.5px] rounded-full overflow-hidden">
          <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#3b82f6,#06b6d4,#3b82f6,#6366f1,#3b82f6)] animate-[spin_5s_linear_infinite]" />
        </div>
        <div className="relative">
          {children}
        </div>
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}
