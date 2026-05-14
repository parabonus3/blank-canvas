import { cn } from "@/lib/utils";
import { getWallpaperById, type WallpaperDef } from "@/lib/wallpapers";

interface WallpaperProps {
  /** Wallpaper id from src/lib/wallpapers.ts ("none" or null = nothing rendered) */
  background?: string | null;
  /** Visual variant. "card" = subtle for use as card background; "page" = full-bleed. */
  variant?: "card" | "page";
  /** Overlay strength (0-1). Higher = more readable text, less wallpaper visibility. */
  overlay?: number;
  className?: string;
  /** When provided, render the wallpaper definition directly (used by pickers for previews). */
  forceDef?: WallpaperDef | null;
  rounded?: boolean;
}

/**
 * Decorative wallpaper layer. Renders nothing when background is "none" or unknown.
 * Always pair with content that has its own readable surface (overlay handles contrast).
 */
export function Wallpaper({
  background,
  variant = "card",
  overlay,
  className,
  forceDef,
  rounded,
}: WallpaperProps) {
  const def = forceDef ?? getWallpaperById(background);
  if (!def) return null;

  const overlayOpacity =
    overlay ?? (variant === "page" ? 0.55 : 0.7);

  // Animated wallpapers shift background-position, so we need a backgroundSize > 100%
  // to make the motion visible. Static wallpapers stay at "cover".
  const bgSize = def.animationClass ? "200% 200%" : "cover";

  return (
    <>
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 z-0 pointer-events-none motion-reduce:!animate-none",
          rounded && "rounded-[inherit]",
          def.animationClass,
          className,
        )}
        style={{ background: def.background, backgroundSize: bgSize }}
      />
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 z-0 pointer-events-none backdrop-blur-[2px]",
          rounded && "rounded-[inherit]",
        )}
        style={{ background: `hsl(var(--background) / ${overlayOpacity})` }}
      />
    </>
  );
}
