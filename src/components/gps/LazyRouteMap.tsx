import { Component, Suspense, lazy, type ReactNode } from "react";
import { MapPinOff } from "lucide-react";
import type { GeoPoint } from "@/lib/geo";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const RouteMap = lazy(() => import("@/components/gps/RouteMap"));

interface Props {
  points: GeoPoint[];
  className?: string;
  follow?: boolean;
  interactive?: boolean;
}

/** Keeps a map failure from ever blanking the whole app. */
class MapErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[runs] falha ao renderizar o mapa:", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Loads Leaflet only when a map is actually shown. */
export function LazyRouteMap({ points, className, follow, interactive }: Props) {
  return (
    <MapErrorBoundary
      fallback={
        <div
          className={cn(
            "rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-1 text-center px-4",
            className,
          )}
        >
          <MapPinOff className="h-5 w-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            O mapa não pôde ser carregado — o trajeto continua sendo gravado.
          </p>
        </div>
      }
    >
      <Suspense fallback={<Skeleton className={cn("rounded-xl", className)} />}>
        <RouteMap points={points} className={className} follow={follow} interactive={interactive} />
      </Suspense>
    </MapErrorBoundary>
  );
}
