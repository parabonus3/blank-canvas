import { Suspense, lazy } from "react";
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

/** Loads Leaflet only when a map is actually shown. */
export function LazyRouteMap({ points, className, follow, interactive }: Props) {
  return (
    <Suspense fallback={<Skeleton className={cn("rounded-xl", className)} />}>
      <RouteMap points={points} className={className} follow={follow} interactive={interactive} />
    </Suspense>
  );
}
