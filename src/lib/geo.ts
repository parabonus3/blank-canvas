/**
 * Geo helpers — 100% client-side, no API keys.
 * Point format is compact on purpose (stored as jsonb arrays):
 * [lat, lng, tMsSinceStart, altitudeMeters | null]
 */

export type GeoPoint = [number, number, number, number | null];

export interface RunSplit {
  km: number;
  seconds: number;
  paceSecondsPerKm: number;
  meters: number;
}

const EARTH_RADIUS_M = 6371008.8;

export function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLng = (bLng - aLng) * toRad;
  const lat1 = aLat * toRad;
  const lat2 = bLat * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function totalDistanceMeters(points: GeoPoint[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += haversineMeters(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
  }
  return d;
}

/** Sum of positive altitude deltas, with a small threshold to ignore GPS noise. */
export function elevationGainMeters(points: GeoPoint[], threshold = 1.5): number {
  let gain = 0;
  let ref: number | null = null;
  for (const p of points) {
    const alt = p[3];
    if (alt == null || !Number.isFinite(alt)) continue;
    if (ref == null) {
      ref = alt;
      continue;
    }
    const diff = alt - ref;
    if (diff > threshold) {
      gain += diff;
      ref = alt;
    } else if (diff < -threshold) {
      ref = alt;
    }
  }
  return gain;
}

/** Bounding box of the route: [[minLat, minLng], [maxLat, maxLng]] */
export function boundsOf(points: GeoPoint[]): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;
  let minLat = points[0][0];
  let maxLat = points[0][0];
  let minLng = points[0][1];
  let maxLng = points[0][1];
  for (const [lat, lng] of points) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

/** Douglas–Peucker simplification (tolerance in degrees ≈ 1e-5 → ~1.1 m). */
export function simplify(points: GeoPoint[], tolerance = 0.000015): GeoPoint[] {
  if (points.length < 3) return points;

  const sqTol = tolerance * tolerance;

  const sqSegDist = (p: GeoPoint, a: GeoPoint, b: GeoPoint) => {
    let x = a[1];
    let y = a[0];
    let dx = b[1] - x;
    let dy = b[0] - y;
    if (dx !== 0 || dy !== 0) {
      const tt = ((p[1] - x) * dx + (p[0] - y) * dy) / (dx * dx + dy * dy);
      if (tt > 1) {
        x = b[1];
        y = b[0];
      } else if (tt > 0) {
        x += dx * tt;
        y += dy * tt;
      }
    }
    dx = p[1] - x;
    dy = p[0] - y;
    return dx * dx + dy * dy;
  };

  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length) {
    const [first, last] = stack.pop()!;
    let maxSq = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const sq = sqSegDist(points[i], points[first], points[last]);
      if (sq > maxSq) {
        maxSq = sq;
        index = i;
      }
    }
    if (index !== -1 && maxSq > sqTol) {
      keep[index] = true;
      stack.push([first, index], [index, last]);
    }
  }

  return points.filter((_, i) => keep[i]);
}

/** Per-kilometer splits derived from cumulative distance + timestamps. */
export function computeSplits(points: GeoPoint[]): RunSplit[] {
  if (points.length < 2) return [];
  const splits: RunSplit[] = [];
  let dist = 0;
  let lastSplitDist = 0;
  let lastSplitTime = points[0][2];

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const seg = haversineMeters(prev[0], prev[1], cur[0], cur[1]);
    dist += seg;

    while (dist - lastSplitDist >= 1000) {
      const overshoot = dist - lastSplitDist - 1000;
      const ratio = seg > 0 ? 1 - overshoot / seg : 1;
      const tAtKm = prev[2] + (cur[2] - prev[2]) * Math.max(0, Math.min(1, ratio));
      const seconds = Math.max(1, Math.round((tAtKm - lastSplitTime) / 1000));
      splits.push({
        km: splits.length + 1,
        seconds,
        paceSecondsPerKm: seconds,
        meters: 1000,
      });
      lastSplitDist += 1000;
      lastSplitTime = tAtKm;
    }
  }

  const remaining = dist - lastSplitDist;
  if (remaining > 50) {
    const seconds = Math.max(1, Math.round((points[points.length - 1][2] - lastSplitTime) / 1000));
    splits.push({
      km: splits.length + 1,
      seconds,
      paceSecondsPerKm: Math.round((seconds / remaining) * 1000),
      meters: Math.round(remaining),
    });
  }

  return splits;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatPace(secondsPerKm: number | null | undefined): string {
  if (!secondsPerKm || !Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return "--:--";
  const capped = Math.min(secondsPerKm, 59 * 60 + 59);
  const m = Math.floor(capped / 60);
  const s = Math.round(capped % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function paceFrom(distanceMeters: number, seconds: number): number | null {
  // Abaixo de 100 m o ritmo não é confiável (ruído de GPS) — melhor não mostrar.
  if (distanceMeters < 100 || seconds <= 0) return null;
  return (seconds / distanceMeters) * 1000;
}
