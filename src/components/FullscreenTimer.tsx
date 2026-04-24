import { useEffect, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimerContext } from '@/contexts/TimerContext';
import { usePomodoro } from '@/contexts/PomodoroContext';
import { useAmbientSoundContext } from '@/contexts/AmbientSoundContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { X, Play, Pause, Square, SkipForward, Volume2, VolumeX, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FullscreenTimerProps {
  mode: 'normal' | 'pomodoro';
  elapsed?: number;
  onClose: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  streak?: number | null;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function FullscreenTimer({ mode, elapsed = 0, onClose, onPause, onResume, onStop, streak }: FullscreenTimerProps) {
  const { t } = useTranslation();
  const timerCtx = useTimerContext();
  const pomodoro = usePomodoro();
  const ambient = useAmbientSoundContext();

  const isPaused = mode === 'normal' ? timerCtx.isPaused : !pomodoro.state.isRunning && pomodoro.state.phase !== 'idle';
  const isRunning = mode === 'normal' ? !timerCtx.isPaused : pomodoro.state.isRunning;

  // Try native fullscreen on mount
  useEffect(() => {
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    }
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Listen for ESC exiting fullscreen
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        onClose();
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [onClose]);

  // Escape key fallback
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handlePauseResume = () => {
    if (mode === 'normal') {
      isPaused ? onResume?.() : onPause?.();
    } else {
      isPaused ? pomodoro.resume() : pomodoro.pause();
    }
  };

  const handleStop = () => {
    if (mode === 'normal') {
      onStop?.();
    } else {
      pomodoro.stop();
    }
    onClose();
  };

  // Get display time
  const displayTime = mode === 'normal'
    ? formatTime(elapsed)
    : pomodoro.formatTime(pomodoro.state.timeRemaining);

  // Pomodoro phase info
  const phaseColors: Record<string, string> = {
    work: 'text-orange-500',
    short_break: 'text-green-500',
    long_break: 'text-blue-500',
    idle: 'text-muted-foreground',
  };
  const phaseLabels: Record<string, string> = {
    work: t('pomodoro.focus'),
    short_break: t('pomodoro.short_break'),
    long_break: t('pomodoro.long_break'),
    idle: t('pomodoro.ready'),
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center select-none">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        <X className="h-6 w-6 sm:h-7 sm:w-7" />
      </button>

      {/* Streak badge */}
      {streak != null && streak > 0 && (
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30">
          <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
          <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{streak}</span>
        </div>
      )}

      {/* Phase label (Pomodoro only) */}
      {mode === 'pomodoro' && pomodoro.state.phase !== 'idle' && (
        <div className={cn('text-lg sm:text-xl font-medium mb-2', phaseColors[pomodoro.state.phase])}>
          {phaseLabels[pomodoro.state.phase]}
        </div>
      )}

      {/* Main timer display */}
      <div
        className={cn(
          'font-mono font-bold transition-colors leading-none',
          'text-[18vw] sm:text-[15vw] landscape:text-[12vh]',
          mode === 'normal'
            ? (isRunning ? 'text-primary' : 'text-warning')
            : phaseColors[pomodoro.state.phase] || 'text-primary'
        )}
      >
        {displayTime}
      </div>

      {/* Status */}
      <div className="mt-3 flex items-center gap-2">
        <span className={cn(
          'w-2.5 h-2.5 rounded-full',
          isRunning ? 'bg-primary animate-pulse' : 'bg-warning'
        )} />
        <span className={cn('text-sm sm:text-base', isRunning ? 'text-primary' : 'text-warning')}>
          {isPaused ? t('timer.paused') : t('timer.in_progress')}
        </span>
      </div>

      {/* Controls */}
      <div className="mt-8 sm:mt-10 flex items-center gap-4 sm:gap-6">
        {/* Pause/Resume */}
        <Button
          size="lg"
          variant="outline"
          onClick={handlePauseResume}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full"
        >
          {isPaused ? <Play className="h-5 w-5 sm:h-6 sm:w-6" /> : <Pause className="h-5 w-5 sm:h-6 sm:w-6" />}
        </Button>

        {/* Stop */}
        <Button
          size="lg"
          variant="destructive"
          onClick={handleStop}
          className="w-18 h-18 sm:w-20 sm:h-20 rounded-full"
        >
          <Square className="h-6 w-6 sm:h-7 sm:w-7" />
        </Button>

        {/* Skip (Pomodoro only) */}
        {mode === 'pomodoro' && (
          <Button
            size="lg"
            variant="outline"
            onClick={() => pomodoro.skip()}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full"
          >
            <SkipForward className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        )}
      </div>

      {/* Mini ambient sound player */}
      {ambient.currentSound && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50 backdrop-blur-sm border border-border/50">
          <button onClick={() => ambient.toggle()} className="text-muted-foreground hover:text-foreground transition-colors">
            {ambient.isPlaying ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <span className="text-xs text-muted-foreground">{ambient.currentSound.icon}</span>
          <Slider
            value={[ambient.volume * 100]}
            onValueChange={([v]) => ambient.setVolume(v / 100)}
            max={100}
            step={1}
            className="w-24"
          />
        </div>
      )}
    </div>
  );
}
