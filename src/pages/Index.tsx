import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSaveTimeEntryTags } from "@/hooks/useTags";
import { MainLayout } from "@/components/layout/MainLayout";
import { useProjects } from "@/hooks/useProjects";
import { useActiveTimeEntry, useStartTimer, useStopTimer } from "@/hooks/useTimeEntries";
import { useProfile } from "@/hooks/useProfile";
import { useAmbientSound } from "@/hooks/useAmbientSound";
import { useTimerContext } from "@/contexts/TimerContext";
import { useAuth } from "@/contexts/AuthContext";
import { useStreakFreeze } from "@/hooks/useStreakFreeze";
import { supabase } from "@/integrations/supabase/client";
import { playTimerResume } from "@/lib/soundEffects";
import { playPageStart, playPauseSound, playStopSound } from "@/lib/uiSounds";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectPicker } from "@/components/ProjectPicker";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { AmbientSoundPlayer } from "@/components/AmbientSoundPlayer";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { Play, Square, Clock, Timer, Pause, Flame, Shield, Maximize2 } from "lucide-react";
import { FullscreenTimer } from "@/components/FullscreenTimer";
import { cn } from "@/lib/utils";
import { StopTimerDialog } from "@/components/StopTimerDialog";
import { RoomPicker } from "@/components/RoomPicker";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { StreakDetailModal } from "@/components/StreakDetailModal";
import { InactivityCheckModal, resetInactivityCheck, initInactivityCheck } from "@/components/InactivityCheckModal";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function Index() {
  const { t } = useTranslation();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: activeEntry, isLoading: isLoadingEntry } = useActiveTimeEntry();
  const { data: profile } = useProfile();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const saveEntryTags = useSaveTimeEntryTags();
  
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [elapsed, setElapsed] = useState(0);
  const [lastReminderAt, setLastReminderAt] = useState(0);
  const [timerMode, setTimerMode] = useState<"normal" | "pomodoro">("normal");
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string>("none");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);

  const { isPaused, pausedElapsed, pauseStartTime, pause: contextPause, resume: contextResume, resetPause, addPausedSeconds, hydrateFromServer } = useTimerContext();
  const { user } = useAuth();
  const { remaining, hasFreezes, autoUsedDates, purchasedBalance, total } = useStreakFreeze();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Handle Stripe freeze purchase return
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("freeze_purchase");
    if (!status) return;

    if (status === "success") {
      toast({
        title: `🛡️ ${t("streak.purchase_success")}`,
      });
      // Webhook may take a few seconds — invalidate now and again shortly
      queryClient.invalidateQueries({ queryKey: ["purchasedFreezes"] });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["purchasedFreezes"] });
      }, 3000);
    } else if (status === "cancel") {
      toast({ title: t("streak.purchase_cancel") });
    }

    params.delete("freeze_purchase");
    const newSearch = params.toString();
    navigate(
      { pathname: location.pathname, search: newSearch ? `?${newSearch}` : "" },
      { replace: true }
    );
  }, [location.search]);

  // Wrap pause/resume to sync is_timer_active with room_members + paused_at on time_entries
  const handlePause = useCallback(() => {
    contextPause();
    playPauseSound();
    if (user) {
      supabase
        .from("room_members")
        .update({ is_timer_active: false, last_active_at: new Date().toISOString() } as any)
        .eq("user_id", user.id)
        .then(() => {});
      // Mark active time_entry as paused on server
      supabase
        .from("time_entries")
        .update({ paused_at: new Date().toISOString() } as any)
        .eq("user_id", user.id)
        .is("end_time", null)
        .or('is_pomodoro.is.null,is_pomodoro.eq.false')
        .then(() => {});
    }
  }, [contextPause, user]);

  const handleResume = useCallback(() => {
    contextResume();
    playTimerResume();
    if (user) {
      supabase
        .from("room_members")
        .update({ is_timer_active: true, last_active_at: new Date().toISOString() } as any)
        .eq("user_id", user.id)
        .then(() => {});
      // Resume on server: accumulate paused_seconds and clear paused_at
      (async () => {
        const { data: entry } = await supabase
          .from("time_entries")
          .select("id, paused_at, paused_seconds" as any)
          .eq("user_id", user.id)
          .is("end_time", null)
          .or('is_pomodoro.is.null,is_pomodoro.eq.false')
          .maybeSingle();
        const e: any = entry;
        if (e?.id && e?.paused_at) {
          const addSec = Math.max(0, Math.floor((Date.now() - new Date(e.paused_at).getTime()) / 1000));
          await supabase
            .from("time_entries")
            .update({
              paused_at: null,
              paused_seconds: (e.paused_seconds || 0) + addSec,
            } as any)
            .eq("id", e.id);
        }
      })();
    }
  }, [contextResume, user]);

  // Presence heartbeat: while timer is running and not paused, refresh last_active_at every 5min
  useEffect(() => {
    if (!user || !activeEntry || isPaused) return;
    const ping = () => {
      supabase
        .from("room_members")
        .update({ last_active_at: new Date().toISOString() } as any)
        .eq("user_id", user.id)
        .then(() => {});
    };
    ping(); // immediate ping
    const interval = setInterval(ping, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, activeEntry?.id, isPaused]);
  
  // Streak query
  const { data: streakRaw } = useQuery({
    queryKey: ["personalStreak", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: streak, error } = await supabase.rpc("get_member_room_streak", { _user_id: user.id });
      if (error) throw error;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("time_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("end_time", "is", null)
        .gte("start_time", todayStart.toISOString());

      return { streak: (streak || 0) as number, studiedToday: (count || 0) > 0 };
    },
    enabled: !!user,
    staleTime: 60000,
  });
  const streakData = streakRaw?.streak ?? null;
  
  // Hook de som ambiente
  const ambientSound = useAmbientSound(
    profile?.ambient_sound,
    profile?.ambient_volume ?? 0.5
  );
  
  // Ref para controlar autoplay
  const hasAutoPlayed = useRef(false);

  const isRunning = !!activeEntry;

  // Defensive hydration from server: if localStorage was wiped (new device, cleared cache),
  // restore pause state from time_entries.paused_at / paused_seconds
  useEffect(() => {
    if (!activeEntry) return;
    const sps = (activeEntry as any).paused_seconds ?? 0;
    const spa = (activeEntry as any).paused_at ?? null;
    if (sps > 0 || spa) {
      hydrateFromServer(sps, spa);
    }
  }, [activeEntry?.id, hydrateFromServer]);

  // Calculate elapsed time
  useEffect(() => {
    if (isLoadingEntry) return; // Don't reset while loading
    if (!activeEntry) {
      setElapsed(0);
      resetPause();
      return;
    }

    const startTime = new Date(activeEntry.start_time).getTime();

    // Se pausado, calcula tempo congelado e para
    if (isPaused) {
      const frozenTime = pauseStartTime
        ? Math.floor((pauseStartTime - startTime) / 1000) - pausedElapsed
        : Math.floor((Date.now() - startTime) / 1000) - pausedElapsed;
      setElapsed(Math.max(0, frozenTime));
      return;
    }
    
    const updateElapsed = () => {
      const now = Date.now();
      setElapsed(Math.max(0, Math.floor((now - startTime) / 1000) - pausedElapsed));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    
    return () => clearInterval(interval);
  }, [activeEntry, isLoadingEntry, isPaused, pausedElapsed]);

  // Reminder system
  const showReminder = useCallback(() => {
    if (profile?.reminder_sound) {
      const audio = new Audio("/notification.mp3");
      audio.play().catch(() => {});
    }
    
    if (profile?.reminder_notification && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(t('timer.reminder_title'), {
          body: t('timer.reminder_body', { time: formatTime(elapsed) }),
          icon: "/favicon.ico",
        });
      }
    }
  }, [profile, elapsed, t]);

  useEffect(() => {
    if (!isRunning || !profile || isPaused) return;
    
    const reminderSeconds = (profile.reminder_interval || 60) * 60;
    
    if (elapsed > 0 && elapsed % reminderSeconds === 0 && elapsed !== lastReminderAt) {
      showReminder();
      setLastReminderAt(elapsed);
    }
  }, [elapsed, isRunning, profile, lastReminderAt, showReminder, isPaused]);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Show onboarding for new users
  useEffect(() => {
    if (profile && profile.onboarding_completed === false) {
      setShowOnboarding(true);
    }
  }, [profile]);

  // Autoplay ambient sound when timer starts
  useEffect(() => {
    if (isRunning && profile?.autoplay_on_timer && profile?.ambient_sound && !hasAutoPlayed.current) {
      const timer = setTimeout(() => {
        ambientSound.play(profile.ambient_sound!);
        hasAutoPlayed.current = true;
      }, 500);
      return () => clearTimeout(timer);
    }
    
    if (!isRunning) {
      hasAutoPlayed.current = false;
    }
  }, [isRunning, profile?.autoplay_on_timer, profile?.ambient_sound]);

  const handleStart = () => {
    if (selectedProject) {
      // Tocar som ANTES de qualquer trabalho assíncrono para preservar o user gesture.
      playPageStart();
      resetInactivityCheck(); // Clear stale check from previous session
      initInactivityCheck(Date.now()); // Initialize timestamp tracking
      const roomId = selectedRoom !== "none" ? selectedRoom : undefined;
      startTimer.mutate({ projectId: selectedProject, roomId });
    }
  };

  const handleStopClick = () => {
    setShowStopDialog(true);
  };

  const handleStopConfirm = (notes?: string, tagIds?: string[]) => {
    if (activeEntry) {
      let totalPausedSeconds = pausedElapsed;
      if (isPaused && pauseStartTime) {
        const currentPauseDuration = Math.floor((Date.now() - pauseStartTime) / 1000);
        totalPausedSeconds += currentPauseDuration;
      }
      
      const roomId = selectedRoom !== "none" ? selectedRoom : undefined;
      stopTimer.mutate({ entryId: activeEntry.id, pausedSeconds: totalPausedSeconds, roomId }, {
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
      resetPause();
      playStopSound();
    }
    setShowStopDialog(false);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onStartStop: () => {
      if (isRunning) {
        handleStopClick();
      } else if (selectedProject) {
        handleStart();
      }
    },
  });

  const activeProjects = projects?.filter(p => p.is_active) || [];

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
        <div className="text-center space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('timer.title')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{t('timer.subtitle')}</p>
        </div>

        {/* Streak Banner */}
        {streakData != null && (() => {
          const studiedToday = streakRaw?.studiedToday ?? false;
          const streakAtRisk = streakData >= 2 && !studiedToday && !isRunning;
          const streakInProgress = isRunning && !studiedToday;
          const streakSecured = studiedToday;

          const borderColor = streakSecured ? "border-emerald-500/30 hover:border-emerald-500/50" : streakInProgress ? "border-cyan-500/30 hover:border-cyan-500/50" : "border-orange-500/30 hover:border-orange-500/50";
          const bgGradient = streakSecured ? "from-emerald-500/10 via-green-500/10 to-emerald-500/10" : streakInProgress ? "from-cyan-500/10 via-blue-500/10 to-cyan-500/10" : "from-orange-500/10 via-amber-500/10 to-orange-500/10";
          const iconColor = streakSecured ? "text-emerald-500 drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]" : streakInProgress ? "text-cyan-500 animate-pulse drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]" : "text-orange-500 animate-pulse drop-shadow-[0_0_6px_rgba(249,115,22,0.6)]";
          const textColor = streakSecured ? "text-emerald-600 dark:text-emerald-400" : streakInProgress ? "text-cyan-600 dark:text-cyan-400" : "text-orange-600 dark:text-orange-400";

          return (
            <button onClick={() => setShowStreakModal(true)} className={cn("w-full animate-fade-in flex items-center justify-center gap-3 rounded-xl border px-4 py-2.5 cursor-pointer transition-colors bg-gradient-to-r", borderColor, bgGradient, streakAtRisk && "animate-glow-pulse")}>
              <div className="flex items-center gap-1.5">
                <Flame className={cn("h-5 w-5", iconColor)} />
                <span className={cn("text-base font-bold", textColor)}>
                  {streakData} {t("rooms.streak_days")}
                </span>
              </div>
              {hasFreezes && remaining > 0 && (
                <div className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                  <Shield className="h-3.5 w-3.5" />
                  {remaining}
                </div>
              )}
            </button>
          );
        })()}

        {/* Timer Mode Selection */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTimerMode("normal")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 sm:p-6 rounded-xl border-2 transition-all",
              timerMode === "normal"
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border hover:border-primary/40"
            )}
          >
            <Clock className="h-7 w-7 sm:h-8 sm:w-8" />
            <span className="text-sm font-medium">{t('timer.normal')}</span>
          </button>
          <button
            onClick={() => setTimerMode("pomodoro")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 sm:p-6 rounded-xl border-2 transition-all",
              timerMode === "pomodoro"
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border hover:border-primary/40"
            )}
          >
            <Timer className="h-7 w-7 sm:h-8 sm:w-8" />
            <span className="text-sm font-medium">🍅 {t('timer.pomodoro')}</span>
          </button>
        </div>

        {/* Timer Content */}
        {timerMode === "normal" ? (
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="text-center pb-2">
              {isRunning && activeEntry?.project && (
                <CardTitle className="text-lg font-medium text-muted-foreground">
                  {activeEntry.project.name}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Timer Display */}
              <div className="text-center">
                <div 
                  className={cn(
                    "text-5xl sm:text-6xl md:text-7xl font-mono font-bold timer-display transition-colors",
                    isRunning && !isPaused ? "text-success" : isPaused ? "text-warning" : "text-muted-foreground"
                  )}
                >
                  {formatTime(elapsed)}
                </div>
                {isRunning && (
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      isPaused ? "bg-warning" : "bg-success animate-pulse"
                    )} />
                    <span className={cn(
                      "text-sm",
                      isPaused ? "text-warning" : "text-success"
                    )}>
                      {isPaused ? t('timer.paused') : t('timer.in_progress')}
                    </span>
                  </div>
                )}
              </div>

              {/* Project Selection */}
              {!isRunning && (
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
                  {activeProjects.length === 0 && !projectsLoading && (
                    <p className="text-sm text-muted-foreground text-center">
                      {t('timer.no_projects')}
                    </p>
                  )}
                </div>
              )}

              {/* Controls */}
              <div className="flex justify-center items-center gap-3 sm:gap-4">
                {isRunning ? (
                  <>
                    {/* Pause/Resume Button */}
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={isPaused ? handleResume : handlePause}
                      className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full"
                    >
                      {isPaused ? <Play className="h-5 w-5 sm:h-6 sm:w-6" /> : <Pause className="h-5 w-5 sm:h-6 sm:w-6" />}
                    </Button>
                    
                    {/* Stop Button */}
                    <Button
                      size="lg"
                      variant="destructive"
                      onClick={handleStopClick}
                      disabled={stopTimer.isPending}
                      className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full shadow-lg"
                    >
                      <Square className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />
                    </Button>

                    {/* Maximize Button */}
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setIsFullscreen(true)}
                      className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full"
                      title={t('timer.fullscreen')}
                    >
                      <Maximize2 className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                  </>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleStart}
                    disabled={!selectedProject || startTimer.isPending}
                    className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full gradient-primary shadow-glow"
                  >
                    <Play className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <PomodoroTimer />
        )}

        {/* Ambient Sound Player */}
        <AmbientSoundPlayer
          defaultSoundId={profile?.ambient_sound}
          defaultVolume={profile?.ambient_volume ?? 0.5}
          className="w-full"
        />

        {/* Stop Timer Dialog */}
        <StopTimerDialog
          open={showStopDialog}
          onOpenChange={setShowStopDialog}
          onConfirm={handleStopConfirm}
          projectName={activeEntry?.project?.name}
          duration={formatTime(elapsed)}
        />

        {/* Fullscreen Timer */}
        {isFullscreen && isRunning && timerMode === "normal" && (
          <FullscreenTimer
            mode="normal"
            elapsed={elapsed}
            onClose={() => setIsFullscreen(false)}
            onPause={handlePause}
            onResume={handleResume}
            onStop={handleStopClick}
            streak={streakData}
          />
        )}

        {/* Onboarding Wizard */}
        {profile && profile.onboarding_completed === false && (
          <OnboardingWizard
            open={!profile.onboarding_completed && showOnboarding}
            onComplete={() => setShowOnboarding(false)}
          />
        )}

        {/* Streak Detail Modal */}
        <StreakDetailModal
          open={showStreakModal}
          onClose={() => setShowStreakModal(false)}
          streak={streakData ?? 0}
          autoUsedDates={autoUsedDates}
          remaining={remaining}
          hasFreezes={hasFreezes}
          purchasedBalance={purchasedBalance}
          total={total}
        />

        {/* Inactivity Check */}
        <InactivityCheckModal
          elapsed={elapsed}
          isRunning={isRunning}
          isPaused={isPaused}
          startTime={activeEntry ? new Date(activeEntry.start_time).getTime() : null}
          onPause={handlePause}
          onResume={handleResume}
          onAdjustPaused={addPausedSeconds}
        />
      </div>
    </MainLayout>
  );
}
