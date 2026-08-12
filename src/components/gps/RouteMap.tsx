import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Polyline, TileLayer, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoPoint } from "@/lib/geo";
import { boundsOf } from "@/lib/geo";
import { cn } from "@/lib/utils";

interface Props {
  points: GeoPoint[];
  className?: string;
  /** Keep the map centered on the newest point while running. */
  follow?: boolean;
  interactive?: boolean;
}

function FitRoute({ points, follow }: { points: GeoPoint[]; follow?: boolean }) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (points.length === 0) return;
    const last = points[points.length - 1];

    if (follow) {
      map.setView([last[0], last[1]], Math.max(map.getZoom(), 16), { animate: false });
      return;
    }

    const b = boundsOf(points);
    if (!b) return;
    if (points.length === 1) {
      map.setView([last[0], last[1]], 16, { animate: false });
      return;
    }
    if (!fittedRef.current || points.length < 3) {
      map.fitBounds(b, { padding: [24, 24] });
      fittedRef.current = true;
    }
  }, [map, points, follow]);

  return null;
}

export default function RouteMap({ points, className, follow, interactive = true }: Props) {
  const center = useMemo<[number, number]>(() => {
    if (points.length > 0) return [points[points.length - 1][0], points[points.length - 1][1]];
    return [0, 0];
  }, [points]);

  const latlngs = useMemo(() => points.map((p) => [p[0], p[1]] as [number, number]), [points]);

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border bg-muted", className)}>
      <MapContainer
        center={center}
        zoom={points.length ? 16 : 2}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        attributionControl
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
        {latlngs.length > 1 && (
          <>
            <Polyline positions={latlngs} pathOptions={{ color: "#0f172a", weight: 7, opacity: 0.25 }} />
            <Polyline positions={latlngs} pathOptions={{ color: "#22c55e", weight: 4 }} />
          </>
        )}
        {latlngs.length > 0 && (
          <CircleMarker
            center={latlngs[0]}
            radius={6}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#22c55e", fillOpacity: 1 }}
          />
        )}
        {latlngs.length > 1 && (
          <CircleMarker
            center={latlngs[latlngs.length - 1]}
            radius={6}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#ef4444", fillOpacity: 1 }}
          />
        )}
        <FitRoute points={points} follow={follow} />
      </MapContainer>
    </div>
  );
}
