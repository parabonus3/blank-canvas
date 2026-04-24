import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useActiveTimeEntry, useStopTimer } from "@/hooks/useTimeEntries";
import { useSaveTimeEntryTags } from "@/hooks/useTags";
import { useSidebar } from "@/components/ui/sidebar";
import { useTimerContext } from "@/contexts/TimerContext";
import { usePomodoro } from "@/contexts/PomodoroContext";
import { Button } from "@/components/ui/button";
import { Square, Timer, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import { StopTimerDialog } from "@/components/StopTimerDialog";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function SidebarMiniPomodoro() {
  const navigate = useNavigate();
  const { state, config, formatTime: fmtPomo, stop } = usePomodoro();
  const { state: sidebarState } = useSidebar();
  const isCollapsed = sidebarState === "collapsed";

  if (state.phase === 'idle') return null;

  const isWork = state.phase === 'work';
  const isRunning = state.isRunning;
  const dotColor = !isRunning ? "bg-warning" : isWork ? "bg-destructive animate-pulse" : "bg-primary animate-pulse";
  const textColor = !isRunning ? "text-warning" : isWork ? "text-destructive" : "text-primary";
  const bgColor = !isRunning 
    ? "bg-warning/10 border-warning/30 hover:bg-warning/15" 
    : isWork 
      ? "bg-destructive/10 border-destructive/30 hover:bg-destructive/15" 
      : "bg-primary/10 border-primary/30 hover:bg-primary/15";
  const phaseLabel = isWork ? "🍅 Foco" : state.phase === 'long_break' ? "☕ Descanso Longo" : "☕ Descanso";

  if (isCollapsed) {
    return (
      <div className="mx-auto mb-2 cursor-pointer" onClick={() => navigate("/timer")}>
        <div className={cn("relative flex items-center justify-center w-10 h-10 rounded-lg", !isRunning ? "bg-warning/20" : isWork ? "bg-destructive/20" : "bg-primary/20")}>
          {isWork ? <Timer className={cn("h-5 w-5", textColor)} /> : <Coffee className={cn("h-5 w-5", textColor)} />}
          <span className={cn("absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full", dotColor)} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("mx-2 mb-3 p-3 rounded-xl border cursor-pointer transition-colors", bgColor)}
      onClick={() => navigate("/timer")}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={cn("w-2 h-2 rounded-full", dotColor)} />
        <span className={cn("text-xs font-medium truncate", textColor)}>
          {phaseLabel}
          {!isRunning && <span className="ml-1 opacity-75">⏸</span>}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className={cn("font-mono text-lg font-bold", textColor)}>
          {fmtPomo(state.timeRemaining)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:bg-destructive/10"
          onClick={(e) => { e.stopPropagation(); stop(); }}
        >
          <Square className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function SidebarMiniTimer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: activeEntry, isLoading: isLoadingEntry } = useActiveTimeEntry();
  const stopTimer = useStopTimer();
  const saveEntryTags = useSaveTimeEntryTags();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { isPaused, pausedElapsed, pauseStartTime } = useTimerContext();
  const pomodoro = usePomodoro();
  const [elapsed, setElapsed] = useState(0);
  const [showStopDialog, setShowStopDialog] = useState(false);

  useEffect(() => {
    if (isLoadingEntry) return;
    if (!activeEntry) {
      setElapsed(0);
      return;
    }

    if (isPaused) {
      const startTime = new Date(activeEntry.start_time).getTime();
      const frozenTime = pauseStartTime
        ? Math.floor((pauseStartTime - startTime) / 1000) - pausedElapsed
        : Math.floor((Date.now() - startTime) / 1000) - pausedElapsed;
      setElapsed(Math.max(0, frozenTime));
      return;
    }

    const startTime = new Date(activeEntry.start_time).getTime();
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - startTime) / 1000) - pausedElapsed));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeEntry, isLoadingEntry, isPaused, pausedElapsed, pauseStartTime]);

  // Pomodoro ativo tem prioridade
  if (pomodoro.state.phase !== 'idle') {
    return <SidebarMiniPomodoro />;
  }

  if (!activeEntry) return null;

  // Filtrar entries do pomodoro — só mostrar cronômetro normal
  if ((activeEntry as any).is_pomodoro) return null;

  const handleStop = (notes?: string, tagIds?: string[]) => {
    let totalPaused = pausedElapsed;
    if (isPaused && pauseStartTime) {
      totalPaused += Math.floor((Date.now() - pauseStartTime) / 1000);
    }
    stopTimer.mutate({ entryId: activeEntry.id, pausedSeconds: totalPaused }, {
      onSuccess: async (data) => {
        if (notes) {
          const { supabase } = await import("@/integrations/supabase/client");
          await supabase.from("time_entries").update({ notes }).eq("id", data.id);
        }
        if (tagIds && tagIds.length > 0) {
          saveEntryTags.mutate({ timeEntryId: data.id, tagIds });
        }
      }
    });
    setShowStopDialog(false);
  };

  const dotColor = isPaused ? "bg-warning" : "bg-success animate-pulse";
  const textColor = isPaused ? "text-warning" : "text-success";

  if (isCollapsed) {
    return (
      <>
        <div className="mx-auto mb-2 cursor-pointer" onClick={() => navigate("/timer")}>
          <div className={cn("relative flex items-center justify-center w-10 h-10 rounded-lg", isPaused ? "bg-warning/20" : "bg-success/20")}>
            <Timer className={cn("h-5 w-5", textColor)} />
            <span className={cn("absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full", dotColor)} />
          </div>
        </div>
        <StopTimerDialog open={showStopDialog} onOpenChange={setShowStopDialog} onConfirm={handleStop} projectName={activeEntry.project?.name} duration={formatTime(elapsed)} />
      </>
    );
  }

  return (
    <>
      <div
        className={cn("mx-2 mb-3 p-3 rounded-xl border cursor-pointer transition-colors", isPaused ? "bg-warning/10 border-warning/30 hover:bg-warning/15" : "bg-success/10 border-success/30 hover:bg-success/15")}
        onClick={() => navigate("/timer")}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className={cn("w-2 h-2 rounded-full", dotColor)} />
          <span className={cn("text-xs font-medium truncate", textColor)}>
            {activeEntry.project?.name}
            {isPaused && <span className="ml-1 opacity-75">⏸</span>}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className={cn("font-mono text-lg font-bold", textColor)}>{formatTime(elapsed)}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); setShowStopDialog(true); }}>
            <Square className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <StopTimerDialog open={showStopDialog} onOpenChange={setShowStopDialog} onConfirm={handleStop} projectName={activeEntry.project?.name} duration={formatTime(elapsed)} />
    </>
  );
}
