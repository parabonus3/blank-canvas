import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { playTimerTick } from '@/lib/soundEffects';
import { playPageStart, playPauseSound, playStopSound } from '@/lib/uiSounds';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

export type PomodoroPhase = 'work' | 'short_break' | 'long_break' | 'idle';

export interface PomodoroState {
  phase: PomodoroPhase;
  timeRemaining: number;
  cyclesCompleted: number;
  isRunning: boolean;
  currentProjectId: string | null;
  activeEntryId: string | null;
  totalPausedTime: number;
  pauseStartTime: number | null;
  phaseStartTime: number | null;
  phaseDuration: number;
  activeRoomId: string | null;
}

interface PomodoroConfig {
  workDuration: number;
  shortBreak: number;
  longBreak: number;
  cyclesBeforeLong: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
}

interface PomodoroContextType {
  state: PomodoroState;
  config: PomodoroConfig;
  start: (projectId: string, roomId?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  skip: () => void;
  reset: () => void;
  formatTime: (seconds: number) => string;
}

const STORAGE_KEY = 'timezoni-pomodoro-state';

const initialState: PomodoroState = {
  phase: 'idle',
  timeRemaining: 0,
  cyclesCompleted: 0,
  isRunning: false,
  currentProjectId: null,
  activeEntryId: null,
  totalPausedTime: 0,
  pauseStartTime: null,
  phaseStartTime: null,
  phaseDuration: 0,
  activeRoomId: null,
};

const defaultConfig: PomodoroConfig = {
  workDuration: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
  cyclesBeforeLong: 4,
  autoStartBreaks: false,
  autoStartWork: false,
};

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

function PomodoroProviderInner({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const intervalRef = useRef<number | null>(null);
  const isInitialized = useRef(false);

  // Config from profile with defaults
  const config: PomodoroConfig = {
    workDuration: (profile?.pomodoro_work_duration ?? 25) * 60,
    shortBreak: (profile?.pomodoro_short_break ?? 5) * 60,
    longBreak: (profile?.pomodoro_long_break ?? 15) * 60,
    cyclesBeforeLong: profile?.pomodoro_cycles_before_long ?? 4,
    autoStartBreaks: profile?.pomodoro_auto_start_breaks ?? false,
    autoStartWork: profile?.pomodoro_auto_start_work ?? false,
  };

  const getPhaseDuration = useCallback((phase: PomodoroPhase): number => {
    switch (phase) {
      case 'work': return config.workDuration;
      case 'short_break': return config.shortBreak;
      case 'long_break': return config.longBreak;
      default: return 0;
    }
  }, [config.workDuration, config.shortBreak, config.longBreak]);

  // Calculate time remaining based on timestamps
  const calculateTimeRemaining = useCallback((savedState: PomodoroState): number => {
    if (savedState.phase === 'idle' || !savedState.phaseStartTime) return 0;

    const now = Date.now();
    let elapsedSinceStart = Math.floor((now - savedState.phaseStartTime) / 1000);

    // Calculate total paused time
    let totalPaused = savedState.totalPausedTime;
    if (savedState.pauseStartTime && !savedState.isRunning) {
      totalPaused += Math.floor((now - savedState.pauseStartTime) / 1000);
    }

    const effectiveElapsed = elapsedSinceStart - totalPaused;
    return Math.max(0, savedState.phaseDuration - effectiveElapsed);
  }, []);

  // Load state from localStorage
  const loadState = useCallback((): PomodoroState => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: PomodoroState = JSON.parse(saved);
        if (parsed.phase !== 'idle' && parsed.phaseStartTime) {
          const remaining = calculateTimeRemaining(parsed);
          return { ...parsed, timeRemaining: remaining };
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error loading pomodoro state:', e);
    }
    return initialState;
  }, [calculateTimeRemaining]);

  const [state, setState] = useState<PomodoroState>(() => loadState());

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (state.phase !== 'idle') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [state]);

  // Initialize state on mount and recalculate time
  useEffect(() => {
    if (!isInitialized.current) {
      const loaded = loadState();
      if (loaded.phase !== 'idle') {
        setState(loaded);
      }
      isInitialized.current = true;
    }
  }, [loadState]);

  const formatTime = useCallback((seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  const playNotificationSound = useCallback(() => {
    playStopSound();
  }, []);

  const showNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
    playNotificationSound();
  }, [playNotificationSound]);

  // Create time entry for work phase
  const createPomodoroEntry = useCallback(async (projectId: string, pomodoroType: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: user.id,
        project_id: projectId,
        start_time: new Date().toISOString(),
        is_pomodoro: true,
        pomodoro_type: pomodoroType,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating pomodoro entry:', error);
      return null;
    }

    queryClient.invalidateQueries({ queryKey: ['activeTimeEntry'] });
    queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    return data;
  }, [user, queryClient]);

  // Stop time entry and sync room time
  const stopPomodoroEntry = useCallback(async (entryId: string, pausedSeconds: number = 0, roomId?: string | null) => {
    const endTime = new Date();

    const { data: entry } = await supabase
      .from('time_entries')
      .select('start_time')
      .eq('id', entryId)
      .single();

    if (!entry) return;

    const startTime = new Date(entry.start_time);
    const durationSeconds = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000) - pausedSeconds);

    await supabase
      .from('time_entries')
      .update({
        end_time: endTime.toISOString(),
        duration: durationSeconds,
      })
      .eq('id', entryId);

    // Sync room time if a room was selected
    if (user && roomId) {
      try {
        const { data: membership } = await supabase
          .from("room_members")
          .select("room_id, total_seconds")
          .eq("user_id", user.id)
          .eq("room_id", roomId)
          .maybeSingle();

        if (membership) {
          await supabase
            .from("room_members")
            .update({
              total_seconds: (membership.total_seconds || 0) + (durationSeconds > 0 ? durationSeconds : 0),
              is_timer_active: false,
              timer_started_at: null,
            } as any)
            .eq("room_id", membership.room_id)
            .eq("user_id", user.id);

          if (durationSeconds >= 60) {
            await supabase.from("room_activity_log").insert({
              room_id: membership.room_id,
              user_id: user.id,
              action_type: "session_completed",
              metadata: { duration_seconds: durationSeconds },
            });
          }
        }
        // Clear timer in other rooms
        await supabase
          .from("room_members")
          .update({ is_timer_active: false, timer_started_at: null } as any)
          .eq("user_id", user.id)
          .neq("room_id", roomId);
      } catch (e) {
        console.error("Room sync error:", e);
      }
    } else if (user) {
      // No room - just clear timer active
      await supabase
        .from("room_members")
        .update({ is_timer_active: false, timer_started_at: null } as any)
        .eq("user_id", user.id);
    }

    queryClient.invalidateQueries({ queryKey: ['activeTimeEntry'] });
    queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    queryClient.invalidateQueries({ queryKey: ['roomMembers'] });
  }, [queryClient, user]);

  // Timer tick effect
  useEffect(() => {
    if (!state.isRunning || state.phase === 'idle') {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setState(prev => {
        if (prev.timeRemaining <= 1) {
          return { ...prev, timeRemaining: 0 };
        }
        // Tick sound for last 5 seconds
        if (prev.timeRemaining <= 6 && prev.timeRemaining > 1) {
          playTimerTick();
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.isRunning, state.phase]);

  // Phase transition effect
  useEffect(() => {
    if (state.timeRemaining !== 0 || state.phase === 'idle' || !state.isRunning) {
      return;
    }

    const handlePhaseTransition = async () => {
      if (state.phase === 'work' && state.activeEntryId) {
        await stopPomodoroEntry(state.activeEntryId, state.totalPausedTime, state.activeRoomId);
      }

      let nextPhase: PomodoroPhase;
      let newCycles = state.cyclesCompleted;

      if (state.phase === 'work') {
        newCycles = state.cyclesCompleted + 1;
        if (newCycles >= config.cyclesBeforeLong) {
          nextPhase = 'long_break';
          newCycles = 0;
        } else {
          nextPhase = 'short_break';
        }
      } else {
        nextPhase = 'work';
      }

      const duration = getPhaseDuration(nextPhase);
      let newActiveEntryId: string | null = null;

      if (nextPhase === 'work' && state.currentProjectId) {
        const entry = await createPomodoroEntry(state.currentProjectId, 'work');
        newActiveEntryId = entry?.id || null;
      }

      const shouldAutoStart =
        (nextPhase === 'work' && config.autoStartWork) ||
        ((nextPhase === 'short_break' || nextPhase === 'long_break') && config.autoStartBreaks);

      const phaseNames: Record<PomodoroPhase, string> = {
        work: 'Foco',
        short_break: 'Descanso Curto',
        long_break: 'Descanso Longo',
        idle: '',
      };
      showNotification(
        `🍅 ${phaseNames[nextPhase]}`,
        nextPhase === 'work'
          ? 'Hora de focar!'
          : 'Hora de descansar!'
      );

      setState(prev => ({
        ...prev,
        phase: nextPhase,
        timeRemaining: duration,
        phaseDuration: duration,
        phaseStartTime: Date.now(),
        cyclesCompleted: newCycles,
        isRunning: shouldAutoStart,
        activeEntryId: newActiveEntryId,
        totalPausedTime: 0,
        pauseStartTime: null,
      }));
    };

    handlePhaseTransition();
  }, [
    state.timeRemaining,
    state.phase,
    state.activeEntryId,
    state.cyclesCompleted,
    state.currentProjectId,
    state.isRunning,
    state.totalPausedTime,
    config.cyclesBeforeLong,
    config.autoStartWork,
    config.autoStartBreaks,
    getPhaseDuration,
    createPomodoroEntry,
    stopPomodoroEntry,
    showNotification
  ]);

  const start = useCallback(async (projectId: string, roomId?: string) => {
    playPageStart();
    const entry = await createPomodoroEntry(projectId, 'work');
    const duration = config.workDuration;

    // Set timer active in room if selected
    if (user && roomId) {
      try {
        await supabase
          .from("room_members")
          .update({ is_timer_active: true, last_active_at: new Date().toISOString(), timer_started_at: new Date().toISOString() } as any)
          .eq("user_id", user.id)
          .eq("room_id", roomId);
      } catch (e) {
        console.error("Room timer sync error:", e);
      }
    }

    setState({
      phase: 'work',
      timeRemaining: duration,
      phaseDuration: duration,
      phaseStartTime: Date.now(),
      cyclesCompleted: 0,
      isRunning: true,
      currentProjectId: projectId,
      activeEntryId: entry?.id || null,
      totalPausedTime: 0,
      pauseStartTime: null,
      activeRoomId: roomId || null,
    });
  }, [config.workDuration, createPomodoroEntry, user]);

  const pause = useCallback(() => {
    playPauseSound();
    setState(prev => {
      // Sync paused_at on server so explore ranking knows we're paused
      if (prev.activeEntryId) {
        supabase
          .from('time_entries')
          .update({ paused_at: new Date().toISOString() } as any)
          .eq('id', prev.activeEntryId)
          .then(() => {});
      }
      return {
        ...prev,
        isRunning: false,
        pauseStartTime: Date.now(),
      };
    });
  }, []);

  const resume = useCallback(() => {
    setState(prev => {
      const pausedDuration = prev.pauseStartTime
        ? Math.floor((Date.now() - prev.pauseStartTime) / 1000)
        : 0;
      const newTotalPaused = prev.totalPausedTime + pausedDuration;
      // Sync server: clear paused_at and accumulate paused_seconds
      if (prev.activeEntryId) {
        supabase
          .from('time_entries')
          .update({
            paused_at: null,
            paused_seconds: newTotalPaused,
          } as any)
          .eq('id', prev.activeEntryId)
          .then(() => {});
      }
      return {
        ...prev,
        isRunning: true,
        pauseStartTime: null,
        totalPausedTime: newTotalPaused,
      };
    });
  }, []);

  const stop = useCallback(async () => {
    playStopSound();
    let totalPaused = state.totalPausedTime;
    if (state.pauseStartTime) {
      totalPaused += Math.floor((Date.now() - state.pauseStartTime) / 1000);
    }

    if (state.activeEntryId) {
      await stopPomodoroEntry(state.activeEntryId, totalPaused, state.activeRoomId);
    }

    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setState(initialState);
    localStorage.removeItem(STORAGE_KEY);
  }, [state.activeEntryId, state.totalPausedTime, state.pauseStartTime, state.activeRoomId, stopPomodoroEntry]);

  const skip = useCallback(async () => {
    let totalPaused = state.totalPausedTime;
    if (state.pauseStartTime) {
      totalPaused += Math.floor((Date.now() - state.pauseStartTime) / 1000);
    }

    if (state.phase === 'work' && state.activeEntryId) {
      await stopPomodoroEntry(state.activeEntryId, totalPaused, state.activeRoomId);
    }

    let nextPhase: PomodoroPhase;
    let newCycles = state.cyclesCompleted;

    if (state.phase === 'work') {
      newCycles = state.cyclesCompleted + 1;
      if (newCycles >= config.cyclesBeforeLong) {
        nextPhase = 'long_break';
        newCycles = 0;
      } else {
        nextPhase = 'short_break';
      }
    } else {
      nextPhase = 'work';
    }

    const duration = getPhaseDuration(nextPhase);
    let newActiveEntryId: string | null = null;

    if (nextPhase === 'work' && state.currentProjectId) {
      const entry = await createPomodoroEntry(state.currentProjectId, 'work');
      newActiveEntryId = entry?.id || null;
    }

    setState(prev => ({
      ...prev,
      phase: nextPhase,
      timeRemaining: duration,
      phaseDuration: duration,
      phaseStartTime: Date.now(),
      cyclesCompleted: newCycles,
      isRunning: true,
      activeEntryId: newActiveEntryId,
      totalPausedTime: 0,
      pauseStartTime: null,
    }));
  }, [
    state.phase,
    state.activeEntryId,
    state.cyclesCompleted,
    state.currentProjectId,
    state.totalPausedTime,
    state.pauseStartTime,
    state.activeRoomId,
    config.cyclesBeforeLong,
    getPhaseDuration,
    createPomodoroEntry,
    stopPomodoroEntry
  ]);

  const reset = useCallback(() => {
    const duration = getPhaseDuration(state.phase);
    setState(prev => ({
      ...prev,
      timeRemaining: duration,
      phaseDuration: duration,
      phaseStartTime: Date.now(),
      isRunning: false,
      totalPausedTime: 0,
      pauseStartTime: null,
    }));
  }, [state.phase, getPhaseDuration]);

  // Presence heartbeat: ping last_active_at every 5min while pomodoro work phase is running
  useEffect(() => {
    if (!user || !state.isRunning || state.phase !== 'work') return;
    const ping = () => {
      supabase
        .from('room_members')
        .update({ last_active_at: new Date().toISOString() } as any)
        .eq('user_id', user.id)
        .then(() => {});
    };
    ping();
    const interval = setInterval(ping, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, state.isRunning, state.phase]);

  return (
    <PomodoroContext.Provider value={{
      state,
      config,
      start,
      pause,
      resume,
      stop,
      skip,
      reset,
      formatTime,
    }}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  
  // If not authenticated or still loading, provide a default context
  if (loading || !user) {
    const noopAsync = async () => {};
    const noop = () => {};
    
    return (
      <PomodoroContext.Provider value={{
        state: initialState,
        config: defaultConfig,
        start: noopAsync as (projectId: string, roomId?: string) => void,
        pause: noop,
        resume: noop,
        stop: noopAsync as () => void,
        skip: noopAsync as () => void,
        reset: noop,
        formatTime: (seconds: number) => {
          const m = Math.floor(seconds / 60);
          const s = seconds % 60;
          return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        },
      }}>
        {children}
      </PomodoroContext.Provider>
    );
  }
  
  return <PomodoroProviderInner>{children}</PomodoroProviderInner>;
}

export function usePomodoro() {
  const context = useContext(PomodoroContext);
  if (context === undefined) {
    throw new Error('usePomodoro must be used within a PomodoroProvider');
  }
  return context;
}
