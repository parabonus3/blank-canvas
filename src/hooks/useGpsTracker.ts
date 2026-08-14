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
const GOOD_ACCURACY_M = 12;
const MAX_SPEED_MPS = 12; // ~43 km/h — anything above is a GPS jump
const MIN_SPEED_MPS = 0.7; // abaixo disso é oscilação com a pessoa parada
const MIN_INTERVAL_MS = 3000;
const MIN_DISTANCE_M = 8;
/** Deslocamento precisa superar esta fração da incerteza do fix. */
const ACCURACY_FACTOR = 0.7;
/** Janela inicial em que o sinal só serve para fixar a posição de partida. */
const WARMUP_MS = 10000;
/** Peso do ponto anterior na suavização quando a precisão está ruim. */
const SMOOTHING = 0.35;

export type AccuracyQuality = "good" | "fair" | "weak" | null;


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
  /** Fim da janela de aquecimento do sinal (sem acumular distância). */
  const warmupUntilRef = useRef<number | null>(null);


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
    const { latitude, longitude, altitude, accuracy: acc, speed: reportedSpeed } = pos.coords;
    setAccuracy(acc ?? null);

    if (acc != null && acc > MAX_ACCURACY_M) return;

    const startedAt = startedAtRef.current ?? Date.now();
    startedAtRef.current = startedAt;
    const t = Math.max(0, pos.timestamp - startedAt - pausedMsRef.current);
    const prev = pointsRef.current[pointsRef.current.length - 1];

    const pushPoint = (lat: number, lng: number, tMs: number) => {
      const point: GeoPoint = [
        Number(lat.toFixed(6)),
        Number(lng.toFixed(6)),
        tMs,
        altitude != null && Number.isFinite(altitude) ? Math.round(altitude) : null,
      ];
      pointsRef.current = [...pointsRef.current, point];
      setPoints(pointsRef.current);
      persist({ startedAt, points: pointsRef.current, pausedMs: pausedMsRef.current });
    };

    if (prev && skipDistanceRef.current) {
      skipDistanceRef.current = false;
      pushPoint(latitude, longitude, Math.max(t, prev[2]));
      return;
    }

    // Warm-up: os primeiros segundos só servem para fixar a posição inicial.
    if (warmupUntilRef.current == null) warmupUntilRef.current = Date.now() + WARMUP_MS;
    const warmingUp = Date.now() < warmupUntilRef.current && (acc == null || acc > GOOD_ACCURACY_M);

    if (!prev) {
      pushPoint(latitude, longitude, t);
      return;
    }

    const dt = t - prev[2];
    const rawSeg = haversineMeters(prev[0], prev[1], latitude, longitude);
    // Limiar dependente da precisão: deslocamento precisa superar a incerteza do fix.
    const threshold = Math.max(MIN_DISTANCE_M, (acc ?? MIN_DISTANCE_M) * ACCURACY_FACTOR);

    if (warmingUp) {
      // Reposiciona o ponto inicial enquanto o sinal estabiliza, sem somar distância.
      if (pointsRef.current.length === 1) {
        pointsRef.current = [[Number(latitude.toFixed(6)), Number(longitude.toFixed(6)), prev[2], prev[3]]];
        setPoints(pointsRef.current);
        persist({ startedAt, points: pointsRef.current, pausedMs: pausedMsRef.current });
      }
      return;
    }

    if (dt < MIN_INTERVAL_MS && rawSeg < threshold) return;
    if (rawSeg < threshold) return;

    if (dt > 0) {
      const speed = rawSeg / (dt / 1000);
      if (speed > MAX_SPEED_MPS) return; // salto impossível
      if (speed < MIN_SPEED_MPS) return; // oscilação com a pessoa parada
      if (speed > maxSpeedRef.current) maxSpeedRef.current = speed;
    }

    // Aparelho informando velocidade ~0 → está parado, é ruído.
    if (reportedSpeed != null && Number.isFinite(reportedSpeed) && reportedSpeed < MIN_SPEED_MPS) return;

    // Suavização ponderada pela precisão para o traçado ficar menos serrilhado.
    const w = acc != null && acc > GOOD_ACCURACY_M ? SMOOTHING : 0;
    const lat = latitude * (1 - w) + prev[0] * w;
    const lng = longitude * (1 - w) + prev[1] * w;

    distanceRef.current += haversineMeters(prev[0], prev[1], lat, lng);
    setDistance(distanceRef.current);
    pushPoint(lat, lng, t);
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
