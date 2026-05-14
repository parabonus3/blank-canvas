import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getWallpaperById, type WallpaperDef } from "@/lib/wallpapers";

interface RoomFrameProps {
  /** Frame id from src/lib/wallpapers.ts ("none" / null / undefined renders no frame) */
  background?: string | null;
  /** Frame thickness in pixels. Default 2. */
  thickness?: number;
  /** Border radius class to mirror the wrapped element (e.g. "rounded-xl"). */
  rounded?: string;
  className?: string;
  children: ReactNode;
  /** When true (page mode), make the frame thicker for full-screen room hero. */
  variant?: "card" | "page";
}

/**
 * RoomFrame — wraps content with an animated CONTOUR only.
 * The interior never gets a background fill; it always uses the host's bg-card / bg-background.
 * Free / unknown ids render a normal `border` so layout is not affected.
 */
export function RoomFrame({
  background,
  thickness,
  rounded = "rounded-xl",
  className,
  children,
  variant = "card",
}: RoomFrameProps) {
  const def: WallpaperDef | null = getWallpaperById(background);

  if (!def) {
    return (
      <div className={cn(rounded, "border bg-card", className)}>{children}</div>
    );
  }

  const t = thickness ?? (variant === "page" ? 3 : 2);
  const animated = def.animationClass;

  return (
    <div
      className={cn(
        "relative isolate",
        rounded,
        animated && "motion-reduce:[animation:none]",
        className,
      )}
      style={{
        padding: t,
        background: def.borderBackground,
        backgroundSize: animated ? "300% 300%" : "100% 100%",
      }}
      data-frame={def.id}
    >
      <div
        aria-hidden
        className={cn("absolute inset-0 -z-10", rounded, animated)}
        style={{
          background: def.borderBackground,
          backgroundSize: animated ? "300% 300%" : "100% 100%",
        }}
      />
      <div className={cn(rounded, "bg-card relative")}>{children}</div>
    </div>
  );
}

