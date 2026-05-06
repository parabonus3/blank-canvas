import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useTimerContext } from '@/contexts/TimerContext';
import { usePomodoro } from '@/contexts/PomodoroContext';
import { useAmbientSoundContext } from '@/contexts/AmbientSoundContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

  // Try native fullscreen + lock body scroll
  useEffect(() => {
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) onClose();
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [onClose]);

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
    if (mode === 'normal') onStop?.();
    else pomodoro.stop();
    onClose();
  };

  const displayTime = mode === 'normal'
    ? formatTime(elapsed)
    : pomodoro.formatTime(pomodoro.state.timeRemaining);

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

  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] bg-background flex flex-col select-none overflow-hidden"
      style={{
        width: '100vw',
        height: '100dvh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* Topbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5">
        {streak != null && streak > 0 ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 backdrop-blur">
            <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{streak}</span>
          </div>
        ) : <div />}

        <button
          onClick={onClose}
          aria-label={t('common.close', { defaultValue: 'Close' })}
          className="p-2.5 rounded-full bg-card/40 hover:bg-card/80 backdrop-blur transition-all text-muted-foreground hover:text-foreground active:scale-95"
        >
          <X className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>

      {/* Center: timer */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-0">
        {mode === 'pomodoro' && pomodoro.state.phase !== 'idle' && (
          <div className={cn('text-base sm:text-xl font-medium mb-3 uppercase tracking-widest', phaseColors[pomodoro.state.phase])}>
            {phaseLabels[pomodoro.state.phase]}
          </div>
        )}

        <div
          className={cn(
            'font-mono font-bold leading-none tracking-tight transition-colors text-center',
            mode === 'normal'
              ? (isRunning ? 'text-primary' : 'text-warning')
              : phaseColors[pomodoro.state.phase] || 'text-primary'
          )}
          style={{
            fontSize: 'clamp(4rem, min(22vw, 28vh), 18rem)',
          }}
        >
          {displayTime}
        </div>

        <div className="mt-4 sm:mt-6 flex items-center gap-2">
          <span className={cn('w-2.5 h-2.5 rounded-full', isRunning ? 'bg-primary animate-pulse' : 'bg-warning')} />
          <span className={cn('text-sm sm:text-base font-medium', isRunning ? 'text-primary' : 'text-warning')}>
            {isPaused ? t('timer.paused') : t('timer.in_progress')}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-5 sm:gap-6 px-4 pb-6 sm:pb-10">
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-5 sm:gap-8">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={handlePauseResume}
                  aria-label={isPaused ? t('timer.resume', { defaultValue: 'Resume' }) : t('timer.pause', { defaultValue: 'Pause' })}
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-full p-0 shadow-md hover:shadow-lg active:scale-95 transition-all [&_svg]:size-7 sm:[&_svg]:size-8"
                >
                  {isPaused ? <Play className="ml-0.5" /> : <Pause />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isPaused ? t('timer.resume', { defaultValue: 'Resume' }) : t('timer.pause', { defaultValue: 'Pause' })}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleStop}
                  aria-label={t('timer.stop', { defaultValue: 'Stop' })}
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-full p-0 bg-gradient-to-br from-destructive to-destructive/80 text-destructive-foreground hover:from-destructive/90 hover:to-destructive/70 shadow-lg shadow-destructive/30 hover:shadow-xl hover:shadow-destructive/40 hover:scale-105 active:scale-95 transition-all [&_svg]:size-8 sm:[&_svg]:size-9"
                >
                  <Square className="fill-current" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('timer.stop', { defaultValue: 'Stop' })}</TooltipContent>
            </Tooltip>

            {mode === 'pomodoro' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => pomodoro.skip()}
                    aria-label={t('pomodoro.skip', { defaultValue: 'Skip' })}
                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-full p-0 shadow-md hover:shadow-lg active:scale-95 transition-all [&_svg]:size-7 sm:[&_svg]:size-8"
                  >
                    <SkipForward />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('pomodoro.skip', { defaultValue: 'Skip' })}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>

        {ambient.currentSound && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50 backdrop-blur-sm border border-border/50">
            <button onClick={() => ambient.toggle()} className="text-muted-foreground hover:text-foreground transition-colors">
              {ambient.isPlaying ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <span className="text-xs">{ambient.currentSound.icon}</span>
            <Slider
              value={[ambient.volume * 100]}
              onValueChange={([v]) => ambient.setVolume(v / 100)}
              max={100}
              step={1}
              className="w-24 sm:w-32"
            />
          </div>
        )}
      </div>
    </motion.div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
