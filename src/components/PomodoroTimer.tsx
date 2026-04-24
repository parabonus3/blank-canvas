import { useTranslation } from 'react-i18next';
import { usePomodoro, PomodoroPhase } from '@/contexts/PomodoroContext';
import { useProjects } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectPicker } from '@/components/ProjectPicker';
import { RoomPicker } from '@/components/RoomPicker';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Square, SkipForward, RotateCcw, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { FullscreenTimer } from '@/components/FullscreenTimer';

interface PomodoroTimerProps {
  className?: string;
}

export function PomodoroTimer({ className }: PomodoroTimerProps) {
  const { t } = useTranslation();
  const { data: projects } = useProjects();
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('none');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const {
    state,
    config,
    start,
    pause,
    resume,
    stop,
    skip,
    reset,
    formatTime,
  } = usePomodoro();

  const phaseConfig: Record<PomodoroPhase, { label: string; color: string; bgColor: string }> = {
    work: { label: t('pomodoro.focus'), color: 'text-orange-500', bgColor: 'bg-orange-500' },
    short_break: { label: t('pomodoro.short_break'), color: 'text-green-500', bgColor: 'bg-green-500' },
    long_break: { label: t('pomodoro.long_break'), color: 'text-blue-500', bgColor: 'bg-blue-500' },
    idle: { label: t('pomodoro.ready'), color: 'text-muted-foreground', bgColor: 'bg-muted' },
  };

  const activeProjects = projects?.filter(p => p.is_active) || [];
  const currentPhaseConfig = phaseConfig[state.phase];

  // Calculate progress percentage
  const getProgress = () => {
    if (state.phase === 'idle') return 0;
    const totalDuration = state.phase === 'work' 
      ? config.workDuration 
      : state.phase === 'short_break' 
        ? config.shortBreak 
        : config.longBreak;
    return ((totalDuration - state.timeRemaining) / totalDuration) * 100;
  };

  const handleStart = () => {
    if (selectedProject) {
      const roomId = selectedRoom !== 'none' ? selectedRoom : undefined;
      start(selectedProject, roomId);
    }
  };

  const handleToggle = () => {
    if (state.isRunning) {
      pause();
    } else {
      resume();
    }
  };

  // Render cycle indicators
  const renderCycleIndicators = () => {
    const cycles = [];
    for (let i = 0; i < config.cyclesBeforeLong; i++) {
      cycles.push(
        <span
          key={i}
          className={cn(
            'text-xl',
            i < state.cyclesCompleted ? 'opacity-100' : 'opacity-30'
          )}
        >
          🍅
        </span>
      );
    }
    return cycles;
  };

  return (
    <Card className={cn('border-border/50 shadow-lg', className)}>
      <CardHeader className="text-center pb-2">
        <CardTitle className="flex items-center justify-center gap-2">
          <span className="text-2xl">🍅</span>
          <span>{t('timer.pomodoro')}</span>
        </CardTitle>
        {state.phase !== 'idle' && (
          <div className={cn('text-sm font-medium', currentPhaseConfig.color)}>
            {currentPhaseConfig.label}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Timer Display */}
        <div className="text-center">
          <div 
            className={cn(
              "text-5xl sm:text-6xl md:text-7xl font-mono font-bold transition-colors",
              state.phase === 'idle' ? 'text-muted-foreground' : currentPhaseConfig.color
            )}
          >
            {state.phase === 'idle' 
              ? formatTime(config.workDuration)
              : formatTime(state.timeRemaining)
            }
          </div>
          
          {/* Progress bar */}
          {state.phase !== 'idle' && (
            <div className="mt-4">
              <Progress 
                value={getProgress()} 
                className={cn('h-2', currentPhaseConfig.bgColor)}
              />
            </div>
          )}
          
          {/* Status indicator */}
          {state.isRunning && (
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className={cn('w-2 h-2 rounded-full animate-pulse', currentPhaseConfig.bgColor)} />
              <span className={cn('text-sm', currentPhaseConfig.color)}>{t('timer.in_progress')}</span>
            </div>
          )}
        </div>

        {/* Cycle indicators */}
        <div className="flex justify-center gap-1">
          {renderCycleIndicators()}
        </div>

        {/* Project Selection - only when idle */}
        {state.phase === 'idle' && (
          <div className="space-y-3">
            <ProjectPicker
              value={selectedProject}
              onValueChange={setSelectedProject}
              projects={activeProjects}
            />
            <RoomPicker
              value={selectedRoom}
              onValueChange={setSelectedRoom}
            />
          </div>
        )}

        {/* Current project display */}
        {state.currentProjectId && state.phase !== 'idle' && (
          <div className="text-center text-sm text-muted-foreground">
            {t('pomodoro.project')}: {activeProjects.find(p => p.id === state.currentProjectId)?.name}
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center items-center gap-2 sm:gap-3">
          {state.phase === 'idle' ? (
            <Button
              size="lg"
              onClick={handleStart}
              disabled={!selectedProject}
              className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-orange-500 hover:bg-orange-600 shadow-lg"
            >
              <Play className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 ml-1" />
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={reset}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-full"
              >
                <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              
              <Button
                size="lg"
                onClick={handleToggle}
                className={cn(
                  'w-20 h-20 sm:w-22 sm:h-22 md:w-24 md:h-24 rounded-full shadow-lg',
                  state.isRunning 
                    ? 'bg-yellow-500 hover:bg-yellow-600' 
                    : currentPhaseConfig.bgColor
                )}
              >
                {state.isRunning ? (
                  <Pause className="h-6 w-6 sm:h-7 sm:w-7" />
                ) : (
                  <Play className="h-6 w-6 sm:h-7 sm:w-7 ml-1" />
                )}
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={skip}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-full"
              >
                <SkipForward className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsFullscreen(true)}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-full"
                title={t('timer.fullscreen')}
              >
                <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </>
          )}
        </div>

        {/* Stop button */}
        {state.phase !== 'idle' && (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={stop}
              className="text-destructive hover:text-destructive"
            >
              <Square className="h-4 w-4 mr-2" />
              {t('timer.stop_pomodoro')}
            </Button>
          </div>
        )}
        {/* Fullscreen */}
        {isFullscreen && state.phase !== 'idle' && (
          <FullscreenTimer
            mode="pomodoro"
            onClose={() => setIsFullscreen(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}
