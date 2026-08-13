import { useCallback, useEffect, useRef, useState } from "react";
import {
  boundsOf,
  elevationGainMeters,
  haversineMeters,
  paceFrom,
  simplify,
  totalDistanceMeters,
  type GeoPoint,
} from "@/lib/geo";

const STORAGE_KEY = "timezoni.gpsRun.v1";
const MAX_ACCURACY_M = 35;
const MAX_SPEED_MPS = 12; // ~43 km/h — anything above is a GPS jump
const MIN_INTERVAL_MS = 3000;
const MIN_DISTANCE_M = 5;

export interface GpsRunSummary {
  points: GeoPoint[];
  distanceMeters: number;
  movingSeconds: number;
  elapsedSeconds: number;
  elevationGainMeters: number;
  maxSpeed: number | null;
  avgPaceSecondsPerKm: number | null;
  bounds: [[number, number], [number, number]] | null;
  startedAt: string;
  endedAt: string;
}

interface StoredRun {
  startedAt: number;
  points: GeoPoint[];
  pausedMs?: number;
}

function loadStored(): StoredRun | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRun;
    if (!parsed?.startedAt || !Array.isArray(parsed.points)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(run: StoredRun) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(run));
  } catch {
    /* storage full / private mode — tracking still works in memory */
  }
}

export function clearStoredRun() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

export function hasStoredRun(): boolean {
  const stored = loadStored();
  return !!stored && stored.points.length > 1;
}

export function isGpsSupported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

/**
 * Records the GPS route while the timer runs.
 * Fully free: browser Geolocation API only, no external service.
 */
export function useGpsTracker() {
  const [isTracking, setIsTracking] = useState(false);
  const [points, setPoints] = useState<GeoPoint[]>([]);
  const [distance, setDistance] = useState(0);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<"denied" | "unavailable" | "timeout" | null>(null);
  const [acquiring, setAcquiring] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const pointsRef = useRef<GeoPoint[]>([]);
  const distanceRef = useRef(0);
  const maxSpeedRef = useRef(0);
  const wakeLockRef = useRef<any>(null);
  const pausedMsRef = useRef(0);
  const pauseWallRef = useRef<number | null>(null);
  /** After a resume, the first fix must not add the distance covered while paused. */
  const skipDistanceRef = useRef(false);

  const releaseWakeLock = useCallback(() => {
    try {
      wakeLockRef.current?.release?.();
    } catch {
      /* noop */
    }
    wakeLockRef.current = null;
  }, []);

  const requestWakeLock = useCallback(async () => {
    try {
      const wl = (navigator as any)?.wakeLock;
      if (wl?.request) wakeLockRef.current = await wl.request("screen");
    } catch {
      /* not supported — user is warned to keep the screen on */
    }
  }, []);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    releaseWakeLock();
  }, [releaseWakeLock]);

  const handlePosition = useCallback((pos: GeolocationPosition) => {
    setAcquiring(false);
    setError(null);
    const { latitude, longitude, altitude, accuracy: acc } = pos.coords;
    setAccuracy(acc ?? null);

    if (acc != null && acc > MAX_ACCURACY_M) return;

    const startedAt = startedAtRef.current ?? Date.now();
    startedAtRef.current = startedAt;
    const t = Math.max(0, pos.timestamp - startedAt - pausedMsRef.current);
    const prev = pointsRef.current[pointsRef.current.length - 1];

    if (prev && skipDistanceRef.current) {
      skipDistanceRef.current = false;
      const point: GeoPoint = [
        Number(latitude.toFixed(6)),
        Number(longitude.toFixed(6)),
        Math.max(t, prev[2]),
        altitude != null && Number.isFinite(altitude) ? Math.round(altitude) : null,
      ];
      pointsRef.current = [...pointsRef.current, point];
      setPoints(pointsRef.current);
      persist({ startedAt, points: pointsRef.current, pausedMs: pausedMsRef.current });
      return;
    }

    if (prev) {
      const dt = t - prev[2];
      const seg = haversineMeters(prev[0], prev[1], latitude, longitude);
      if (dt < MIN_INTERVAL_MS && seg < MIN_DISTANCE_M) return;
      if (dt > 0) {
        const speed = seg / (dt / 1000);
        if (speed > MAX_SPEED_MPS) return; // impossible jump
        if (speed > maxSpeedRef.current) maxSpeedRef.current = speed;
      }
      if (seg < MIN_DISTANCE_M) return;
      distanceRef.current += seg;
      setDistance(distanceRef.current);
    }

    const point: GeoPoint = [
      Number(latitude.toFixed(6)),
      Number(longitude.toFixed(6)),
      t,
      altitude != null && Number.isFinite(altitude) ? Math.round(altitude) : null,
    ];
    pointsRef.current = [...pointsRef.current, point];
    setPoints(pointsRef.current);
    persist({ startedAt, points: pointsRef.current, pausedMs: pausedMsRef.current });
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    setAcquiring(false);
    if (err.code === err.PERMISSION_DENIED) {
      setError("denied");
      stopWatch();
      setIsTracking(false);
    } else if (err.code === err.TIMEOUT) {
      setError("timeout");
    } else {
      setError("unavailable");
    }
  }, [stopWatch]);

  const start = useCallback(
    (opts?: { resume?: boolean }) => {
      if (!isGpsSupported()) {
        setError("unavailable");
        return false;
      }

      const stored = opts?.resume ? loadStored() : null;
      if (stored) {
        startedAtRef.current = stored.startedAt;
        pointsRef.current = stored.points;
        pausedMsRef.current = stored.pausedMs ?? 0;
        skipDistanceRef.current = true;
        distanceRef.current = totalDistanceMeters(stored.points);
        setPoints(stored.points);
        setDistance(distanceRef.current);
      } else {
        startedAtRef.current = Date.now();
        pointsRef.current = [];
        distanceRef.current = 0;
        maxSpeedRef.current = 0;
        pausedMsRef.current = 0;
        skipDistanceRef.current = false;
        setPoints([]);
        setDistance(0);
        clearStoredRun();
      }

      pauseWallRef.current = null;
      setIsPaused(false);
      setError(null);
      setAcquiring(true);
      setIsTracking(true);
      void requestWakeLock();

      watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 30000,
      });
      return true;
    },
    [handleError, handlePosition, requestWakeLock],
  );

  const pause = useCallback(() => {
    if (!isTracking || pauseWallRef.current != null) return;
    pauseWallRef.current = Date.now();
    setIsPaused(true);
    setAcquiring(false);
    stopWatch();
  }, [isTracking, stopWatch]);

  const resume = useCallback(() => {
    if (!isTracking || pauseWallRef.current == null) return;
    pausedMsRef.current += Date.now() - pauseWallRef.current;
    pauseWallRef.current = null;
    skipDistanceRef.current = pointsRef.current.length > 0;
    setIsPaused(false);
    setError(null);
    setAcquiring(true);
    void requestWakeLock();
    watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 30000,
    });
  }, [handleError, handlePosition, isTracking, requestWakeLock]);

  const stop = useCallback((elapsedSeconds?: number): GpsRunSummary | null => {
    stopWatch();
    setIsTracking(false);
    setIsPaused(false);
    setAcquiring(false);
    pauseWallRef.current = null;

    const raw = pointsRef.current;
    const startedAt = startedAtRef.current ?? Date.now();
    clearStoredRun();

    if (raw.length < 2) return null;

    const cleaned = simplify(raw);
    const distanceMeters = Math.round(totalDistanceMeters(raw));
    const movingSeconds = Math.round((raw[raw.length - 1][2] - raw[0][2]) / 1000);
    const elapsed = Math.max(movingSeconds, Math.round(elapsedSeconds ?? movingSeconds));

    return {
      points: cleaned,
      distanceMeters,
      movingSeconds,
      elapsedSeconds: elapsed,
      elevationGainMeters: Math.round(elevationGainMeters(raw)),
      maxSpeed: maxSpeedRef.current > 0 ? Number(maxSpeedRef.current.toFixed(2)) : null,
      avgPaceSecondsPerKm: paceFrom(distanceMeters, elapsed),
      bounds: boundsOf(cleaned),
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date().toISOString(),
    };
  }, [stopWatch]);

  const discard = useCallback(() => {
    stopWatch();
    setIsTracking(false);
    setIsPaused(false);
    pauseWallRef.current = null;
    pausedMsRef.current = 0;
    setPoints([]);
    setDistance(0);
    pointsRef.current = [];
    distanceRef.current = 0;
    maxSpeedRef.current = 0;
    startedAtRef.current = null;
    clearStoredRun();
  }, [stopWatch]);

  // Re-acquire the wake lock when the user comes back to the tab
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && isTracking && !isPaused && !wakeLockRef.current) {
        void requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [isTracking, isPaused, requestWakeLock]);

  useEffect(() => stopWatch, [stopWatch]);

  /** Pace over the last ~400 m, for the live panel. */
  const currentPace = (() => {
    const pts = points;
    if (pts.length < 3) return null;
    let d = 0;
    let i = pts.length - 1;
    while (i > 0 && d < 400) {
      d += haversineMeters(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
      i--;
    }
    const seconds = (pts[pts.length - 1][2] - pts[i][2]) / 1000;
    return paceFrom(d, seconds);
  })();

  return {
    supported: isGpsSupported(),
    isTracking,
    isPaused,
    acquiring,
    error,
    accuracy,
    points,
    distance,
    currentPace,
    start,
    pause,
    resume,
    stop,
    discard,
  };
}
