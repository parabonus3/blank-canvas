import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSaveTimeEntryTags } from "@/hooks/useTags";
import { MainLayout } from "@/components/layout/MainLayout";
import { SEO } from "@/components/SEO";
import { ActiveGoalsStrip } from "@/components/timer/ActiveGoalsStrip";
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
import { Play, Square, Clock, Timer, Pause, Flame, Shield, Maximize2, Footprints } from "lucide-react";
import { FullscreenTimer } from "@/components/FullscreenTimer";
import { cn } from "@/lib/utils";
import { StopTimerDialog } from "@/components/StopTimerDialog";
import { RoomPicker } from "@/components/RoomPicker";
import { RoomChallengeBanner } from "@/components/timer/RoomChallengeBanner";
import { RoomChallengePicker } from "@/components/timer/RoomChallengePicker";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { StreakDetailModal } from "@/components/StreakDetailModal";
import { InactivityCheckModal, resetInactivityCheck, initInactivityCheck } from "@/components/InactivityCheckModal";
import { PauseWarningDialog, PAUSE_WARNING_KEY } from "@/components/PauseWarningDialog";
import { useGpsTracker, hasStoredRun } from "@/hooks/useGpsTracker";
import { useSaveGpsActivity } from "@/hooks/useGpsActivities";
import { RunModeToggle } from "@/components/gps/RunModeToggle";
import { RunLivePanel } from "@/components/gps/RunLivePanel";
import { DeepWorkPicker } from "@/components/timer/DeepWorkPicker";
import { DeepWorkBar } from "@/components/timer/DeepWorkBar";
import { useSaveFocusCommitment, type InterruptionReason } from "@/hooks/useFocusCommitments";

const ACTIVE_FOCUS_KEY = "timezoni.activeFocusTarget";

function readActiveFocusTarget(): number | null {
  try {
    const raw = localStorage.getItem(ACTIVE_FOCUS_KEY);
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}


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
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showPauseWarning, setShowPauseWarning] = useState(false);
  const [runMode, setRunMode] = useState(() => localStorage.getItem("timezoni.runMode") === "1");
  const [focusTarget, setFocusTarget] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem("timezoni.focusTarget");
      const n = raw ? parseInt(raw, 10) : NaN;
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  });
  const [activeFocusTarget, setActiveFocusTarget] = useState<number | null>(() => readActiveFocusTarget());
  const saveFocusCommitment = useSaveFocusCommitment();

  const gps = useGpsTracker();
  const saveGpsActivity = useSaveGpsActivity();

  const gpsResumedRef = useRef(false);
  const [runPanelCollapsed, setRunPanelCollapsed] = useState(false);

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

  // Tracks the last in-flight pause/resume server sync, so handleStopConfirm can
  // await it before calling stop_time_entry (avoids race that inflates duration).
  const pauseSyncRef = useRef<Promise<unknown> | null>(null);

  // Pause via RPC: o servidor congela o snapshot exato exibido (clientSeconds).
  const handlePause = useCallback(() => {
    // Mostra aviso de pausa na primeira vez
    try {
      if (!localStorage.getItem(PAUSE_WARNING_KEY)) {
        setShowPauseWarning(true);
      }
    } catch {}
    // Snapshot ANTES de mudar o estado local — esse é o valor que o usuário vê.
    const snapshot = elapsed;
    contextPause();
    playPauseSound();
    if (!user || !activeEntry) return;
    const p = (async () => {
      try {
        await (supabase as any).rpc("pause_time_entry", {
          _entry_id: activeEntry.id,
          _client_seconds: Math.max(0, Math.floor(snapshot)),
        });
      } catch (e) {
        console.error("pause_time_entry error:", e);
      }
      try {
        await supabase
          .from("room_members")
          .update({ is_timer_active: false, last_active_at: new Date().toISOString() } as any)
          .eq("user_id", user.id);
      } catch {}
    })();
    pauseSyncRef.current = p;
  }, [contextPause, user, activeEntry, elapsed]);

  // Resume via RPC: o servidor soma o tempo realmente pausado em paused_seconds.
  const handleResume = useCallback(() => {
    contextResume();
    playTimerResume();
    if (!user || !activeEntry) return;
    const p = (async () => {
      try {
        await (supabase as any).rpc("resume_time_entry", { _entry_id: activeEntry.id });
      } catch (e) {
        console.error("resume_time_entry error:", e);
      }
      try {
        await supabase
          .from("room_members")
          .update({ is_timer_active: true, last_active_at: new Date().toISOString() } as any)
          .eq("user_id", user.id);
      } catch {}
    })();
    pauseSyncRef.current = p;
  }, [contextResume, user, activeEntry]);

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

  // Server-side heartbeat in time_entries (every 60s + visibility/beforeunload)
  // Garante que stop_time_entry consiga descontar tempo "fantasma" se o usuario sumir.
  useEffect(() => {
    if (!user || !activeEntry || isPaused) return;
    const entryId = activeEntry.id;
    const beat = () => {
      (supabase as any).rpc("heartbeat_time_entry", { _entry_id: entryId }).then(() => {});
    };
    beat();
    const interval = setInterval(beat, 60 * 1000);
    const onVisible = () => { if (!document.hidden) beat(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", beat);
    window.addEventListener("beforeunload", beat);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", beat);
      window.removeEventListener("beforeunload", beat);
    };
  }, [user, activeEntry?.id, isPaused]);

  // Reenvia pausa pendente (caso o request falhou na sessão anterior)
  useEffect(() => {
    if (!user) return;
    const pending = (() => { try { return localStorage.getItem("timezoni-pending-pause"); } catch { return null; } })();
    if (!pending) return;
    (async () => {
      const { error } = await supabase
        .from("time_entries")
        .update({ paused_at: pending } as any)
        .eq("user_id", user.id)
        .is("end_time", null)
        .is("paused_at", null)
        .or('is_pomodoro.is.null,is_pomodoro.eq.false');
      if (!error) { try { localStorage.removeItem("timezoni-pending-pause"); } catch {} }
    })();
  }, [user]);

  // Auto-pausa server-side de sessões abandonadas (chama na carga e quando volta o foco)
  useEffect(() => {
    if (!user) return;
    const run = () => { (supabase as any).rpc("auto_pause_stale_entries").then(() => {}); };
    run();
    const onVisible = () => { if (!document.hidden) run(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user]);

  
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

    // Se pausado, calcula tempo congelado. Defesa: se pausedElapsed cresceu
    // demais (servidor incluiu pausa em andamento), clamp para o último elapsed
    // conhecido em vez de cair pra 0 — evita perder tempo ao parar.
    if (isPaused) {
      const pauseRef = pauseStartTime ?? Date.now();
      const grossSinceStart = Math.floor((pauseRef - startTime) / 1000);
      const candidate = grossSinceStart - pausedElapsed;
      if (candidate < 0 && elapsed > 0) {
        console.warn("[timer] pausedElapsed > grossSinceStart — keeping last elapsed", {
          grossSinceStart, pausedElapsed, elapsed,
        });
        return; // mantém elapsed atual, não zera
      }
      setElapsed(Math.max(0, candidate));
      return;
    }
    
    const updateElapsed = () => {
      const now = Date.now();
      const grossSinceStart = Math.floor((now - startTime) / 1000);
      setElapsed(prev => {
        // Defesa anti-regressão: se pausedElapsed > tempo total desde start
        // (dessincronia / double-count), manter o último valor — não zerar.
        if (pausedElapsed > grossSinceStart && prev > 0) {
          return prev;
        }
        const next = Math.max(0, grossSinceStart - pausedElapsed);
        // Nunca deixar o cronômetro retroceder enquanto está rodando
        // (evita "voltar pra 0" após resume se houver re-render atrasado).
        return next < prev ? prev : next;
      });
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    
    return () => clearInterval(interval);
  }, [activeEntry, isLoadingEntry, isPaused, pausedElapsed, pauseStartTime]);

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
        // Respeitar o volume salvo nas configurações antes de tocar
        ambientSound.setVolume(profile.ambient_volume ?? 0.5);
        ambientSound.play(profile.ambient_sound!);
        hasAutoPlayed.current = true;
      }, 500);
      return () => clearTimeout(timer);
    }
    
    if (!isRunning) {
      hasAutoPlayed.current = false;
    }
  }, [isRunning, profile?.autoplay_on_timer, profile?.ambient_sound, profile?.ambient_volume]);

  const handleStart = () => {
    if (selectedProject) {
      // Tocar som ANTES de qualquer trabalho assíncrono para preservar o user gesture.
      playPageStart();
      resetInactivityCheck(); // Clear stale check from previous session
      initInactivityCheck(Date.now()); // Initialize timestamp tracking
      const roomId = selectedRoom !== "none" ? selectedRoom : undefined;
      if (runMode && gps.supported) gps.start();
      // Deep Work: congela a meta assumida nesta sessão (sobrevive a refresh).
      setActiveFocusTarget(focusTarget);
      try {
        if (focusTarget) localStorage.setItem(ACTIVE_FOCUS_KEY, String(focusTarget));
        else localStorage.removeItem(ACTIVE_FOCUS_KEY);
      } catch {}
      startTimer.mutate({ projectId: selectedProject, roomId, challengeId: roomId ? selectedChallenge : null });
    }
  };

  useEffect(() => {
    localStorage.setItem("timezoni.runMode", runMode ? "1" : "0");
  }, [runMode]);

  useEffect(() => {
    try {
      if (focusTarget) localStorage.setItem("timezoni.focusTarget", String(focusTarget));
      else localStorage.removeItem("timezoni.focusTarget");
    } catch {}
  }, [focusTarget]);

  // Sem sessão ativa não existe compromisso em andamento.
  useEffect(() => {
    if (isLoadingEntry || activeEntry) return;
    setActiveFocusTarget(null);
    try { localStorage.removeItem(ACTIVE_FOCUS_KEY); } catch {}
  }, [activeEntry, isLoadingEntry]);


  // Pausar/retomar o rastreamento junto com o cronômetro (sem encerrar a corrida)
  useEffect(() => {
    if (!gps.isTracking) return;
    if (isPaused) gps.pause();
    else gps.resume();
  }, [isPaused, gps.isTracking, gps.pause, gps.resume]);

  // Recupera o trajeto se o app foi fechado/recarregado com o cronômetro rodando
  useEffect(() => {
    if (gpsResumedRef.current) return;
    if (!activeEntry || gps.isTracking || !gps.supported) return;
    if (!hasStoredRun()) return;
    gpsResumedRef.current = true;
    setRunMode(true);
    gps.start({ resume: true });
    toast({ title: t("runs.resumed_title"), description: t("runs.resumed_desc") });
  }, [activeEntry, gps, t, toast]);

  const handleStopClick = () => {
    setShowStopDialog(true);
  };

  const handleStopConfirm = async (notes?: string, tagIds?: string[], reason?: InterruptionReason) => {
    if (activeEntry) {
      // Tocar som ANTES de qualquer trabalho assíncrono para preservar o user gesture do clique de confirmação.
      playStopSound();
      const roomId = selectedRoom !== "none" ? selectedRoom : undefined;
      // Snapshot do que o cronômetro mostra agora — fonte da verdade do usuário.
      let clientSeconds = elapsed;

      // Defesa: se elapsed estiver zerado mas a sessão tem tempo real decorrido,
      // recalcular pelo servidor (start_time + paused_seconds atual) antes de parar.
      // Evita salvar duration=0 quando hydrate/pause dessincronizam.
      try {
        const startMs = new Date(activeEntry.start_time).getTime();
        const serverPaused = Number((activeEntry as any).paused_seconds || 0);
        const grossElapsed = Math.floor((Date.now() - startMs) / 1000);
        const fallback = Math.max(0, grossElapsed - serverPaused);
        if (clientSeconds < 60 && fallback > clientSeconds + 30) {
          console.warn("[timer] elapsed muito baixo no stop — usando fallback do servidor", {
            clientSeconds, fallback, serverPaused, grossElapsed,
          });
          clientSeconds = fallback;
          toast({ title: t("timer.pause_data_loss_recovered") });
        }
      } catch (e) {
        console.error("[timer] erro no fallback do stop:", e);
      }

      // Garante que qualquer pausa/resume em voo terminou antes do stop, evitando race no servidor.
      if (pauseSyncRef.current) {
        try { await pauseSyncRef.current; } catch {}
        pauseSyncRef.current = null;
      }
      const wasTrackingRun = gps.isTracking;
      const runSummary = wasTrackingRun ? gps.stop(clientSeconds) : null;
      if (wasTrackingRun && !runSummary) {
        toast({ title: t("runs.no_track_title"), description: t("runs.no_track_desc") });
      }
      const runProjectId = activeEntry.project_id || selectedProject || null;

      stopTimer.mutate({ entryId: activeEntry.id, roomId, clientSeconds }, {
        onSuccess: async (data) => {
          if (runSummary) {
            try {
              await saveGpsActivity.mutateAsync({
                summary: runSummary,
                timeEntryId: data.id,
                projectId: runProjectId,
              });
              toast({
                title: t("runs.saved_title"),
                description: t("runs.saved_desc", {
                  distance: (runSummary.distanceMeters / 1000).toFixed(2),
                }),
              });
            } catch (e) {
              console.error("[runs] erro ao salvar trajeto:", e);
              toast({ title: t("runs.save_error"), variant: "destructive" });
            }
          }
          if (notes) {
            const { supabase } = await import("@/integrations/supabase/client");
            await supabase.from("time_entries").update({ notes }).eq("id", data.id);
          }
          if (tagIds && tagIds.length > 0) {
            saveEntryTags.mutate({ timeEntryId: data.id, tagIds });
          }
          // Deep Work: registra o compromisso desta sessão (meta batida ou motivo da interrupção).
          if (activeFocusTarget) {
            try {
              await saveFocusCommitment.mutateAsync({
                targetMinutes: activeFocusTarget,
                achievedSeconds: clientSeconds,
                timeEntryId: data.id,
                projectId: runProjectId,
                reason: reason ?? null,
              });
              if (clientSeconds >= activeFocusTarget * 60) {
                toast({
                  title: t("focus.saved_completed", "🎯 Compromisso de {{min}}min cumprido!", { min: activeFocusTarget }),
                });
              }
            } catch (e) {
              console.error("[focus] erro ao salvar compromisso:", e);
            }
          }
        }
      });
      setActiveFocusTarget(null);
      try { localStorage.removeItem(ACTIVE_FOCUS_KEY); } catch {}
      resetPause();
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
      <SEO title="Timezoni" path="/timer" noindex localeOnly />
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
        <div className="text-center space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('timer.title')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{t('timer.subtitle')}</p>
        </div>

        <ActiveGoalsStrip className="px-1" />

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

              {/* Deep Work — progresso do compromisso */}
              {isRunning && activeFocusTarget && (
                <DeepWorkBar targetMinutes={activeFocusTarget} elapsedSeconds={elapsed} />
              )}



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
                  <RoomChallengePicker
                    roomId={selectedRoom}
                    value={selectedChallenge}
                    onChange={setSelectedChallenge}
                  />
                  <RoomChallengeBanner roomId={selectedRoom} activeChallengeId={selectedChallenge} />
                  <RunModeToggle enabled={runMode} onChange={setRunMode} supported={gps.supported} />
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

        {/* Modo corrida — trajeto ao vivo */}
        {isRunning && timerMode === "normal" && gps.isTracking && (
          <RunLivePanel
            points={gps.points}
            distance={gps.distance}
            currentPace={gps.currentPace}
            accuracy={gps.accuracy}
            acquiring={gps.acquiring}
            error={gps.error}
            paused={gps.isPaused || isPaused}
            hideMap={showStopDialog}
            collapsed={runPanelCollapsed}
            onToggleCollapsed={() => setRunPanelCollapsed((v) => !v)}
          />
        )}

        {/* Ativar o modo corrida com a sessão já em andamento (ou depois de um erro de GPS) */}
        {isRunning && timerMode === "normal" && !gps.isTracking && gps.supported && (
          <Button
            variant="outline"
            className="w-full h-11 gap-2"
            onClick={() => {
              setRunMode(true);
              setRunPanelCollapsed(false);
              gps.start({ resume: hasStoredRun() });
            }}
          >
            <Footprints className="h-4 w-4" />
            {t("runs.enable_now")}
          </Button>
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
          runPoints={gps.isTracking ? gps.points : undefined}
          runDistance={gps.distance}
          runPace={gps.currentPace}
          runActive={gps.isTracking}

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
          entryId={activeEntry?.id ?? null}
          onPause={handlePause}
          onResume={handleResume}
          onAdjustPaused={addPausedSeconds}
        />

        <PauseWarningDialog open={showPauseWarning} onOpenChange={setShowPauseWarning} />
      </div>
    </MainLayout>
  );
}
