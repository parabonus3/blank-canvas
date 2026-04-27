import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

const TIMER_PAUSE_KEY = 'timezoni-timer-pause';

interface PauseState {
  isPaused: boolean;
  pausedElapsed: number;
  pauseStartTime: number | null;
}

function loadPauseState(): PauseState {
  try {
    const raw = localStorage.getItem(TIMER_PAUSE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PauseState;
      return {
        isPaused: !!parsed.isPaused,
        pausedElapsed: parsed.pausedElapsed || 0,
        pauseStartTime: parsed.pauseStartTime || null,
      };
    }
  } catch {}
  return { isPaused: false, pausedElapsed: 0, pauseStartTime: null };
}

function savePauseState(state: PauseState) {
  try {
    localStorage.setItem(TIMER_PAUSE_KEY, JSON.stringify(state));
  } catch {}
}

function clearPauseState() {
  try {
    localStorage.removeItem(TIMER_PAUSE_KEY);
  } catch {}
}

interface TimerContextType {
  isPaused: boolean;
  pausedElapsed: number;
  pauseStartTime: number | null;
  pause: () => void;
  resume: () => void;
  resetPause: () => void;
  addPausedSeconds: (seconds: number) => void;
  hydrateFromServer: (serverPausedSeconds: number, serverPausedAt: string | null) => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [isPaused, setIsPaused] = useState(() => loadPauseState().isPaused);
  const [pausedElapsed, setPausedElapsed] = useState(() => loadPauseState().pausedElapsed);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(() => loadPauseState().pauseStartTime);

  // Sync to localStorage whenever state changes
  useEffect(() => {
    savePauseState({ isPaused, pausedElapsed, pauseStartTime });
  }, [isPaused, pausedElapsed, pauseStartTime]);

  const pause = useCallback(() => {
    setIsPaused(true);
    setPauseStartTime(Date.now());
  }, []);

  const resume = useCallback(() => {
    setPauseStartTime(prev => {
      if (prev) {
        const dur = Math.floor((Date.now() - prev) / 1000);
        setPausedElapsed(p => p + dur);
      }
      return null;
    });
    setIsPaused(false);
  }, []);

  const resetPause = useCallback(() => {
    setIsPaused(false);
    setPausedElapsed(0);
    setPauseStartTime(null);
    clearPauseState();
  }, []);

  const addPausedSeconds = useCallback((seconds: number) => {
    if (seconds <= 0) return;
    setPausedElapsed(p => p + Math.floor(seconds));
  }, []);

  // Defensive hydration: if localStorage was cleared but server has pause data, restore it
  const hydrateFromServer = useCallback((serverPausedSeconds: number, serverPausedAt: string | null) => {
    setPausedElapsed(prev => (prev === 0 && serverPausedSeconds > 0 ? serverPausedSeconds : prev));
    if (serverPausedAt) {
      setIsPaused(true);
      setPauseStartTime(prev => prev ?? new Date(serverPausedAt).getTime());
    }
  }, []);

  return (
    <TimerContext.Provider value={{ isPaused, pausedElapsed, pauseStartTime, pause, resume, resetPause, addPausedSeconds, hydrateFromServer }}>
      {children}
    </TimerContext.Provider>
  );
}

const noopTimerContext: TimerContextType = {
  isPaused: false,
  pausedElapsed: 0,
  pauseStartTime: null,
  pause: () => {},
  resume: () => {},
  resetPause: () => {},
  addPausedSeconds: () => {},
  hydrateFromServer: () => {},
};

export function useTimerContext() {
  const ctx = useContext(TimerContext);
  if (!ctx) {
    if (typeof console !== 'undefined') {
      console.warn('useTimerContext used outside TimerProvider — returning no-op fallback');
    }
    return noopTimerContext;
  }
  return ctx;
}
