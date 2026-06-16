import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Play, Pause, Square, Timer as TimerIcon, Music2, Volume2, VolumeX, Trophy, AlertTriangle, ArrowRight, Info, Maximize2 } from "lucide-react";
import { useTimerContext } from "@/contexts/TimerContext";
import { FullscreenTimer } from "@/components/FullscreenTimer";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ProjectPicker } from "@/components/ProjectPicker";
import { useProjects } from "@/hooks/useProjects";
import { useActiveTimeEntry, useStartTimer, useStopTimer } from "@/hooks/useTimeEntries";
import { useAmbientSoundContext } from "@/contexts/AmbientSoundContext";
import { useRoomChallenges } from "@/hooks/useRoomChallenges";
import { cn } from "@/lib/utils";

interface Props {
  roomId: string;
}

function fmt(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function RoomTimerCard({ roomId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const { data: active } = useActiveTimeEntry();
  const { data: challenges = [] } = useRoomChallenges(roomId);
  const start = useStartTimer();
  const stop = useStopTimer();

  const [projectId, setProjectId] = useState<string>("");
  const [elapsed, setElapsed] = useState(0);
  const [showSounds, setShowSounds] = useState(false);
  const [fsOpen, setFsOpen] = useState(false);

  const ambient = useAmbientSoundContext();
  const { isPaused, pausedElapsed, pauseStartTime, pause, resume, resetPause } = useTimerContext();

  const activeChallenges = useMemo(() => challenges.filter((c) => c.is_active), [challenges]);
  const hasChallenge = activeChallenges.length > 0;
  const challengeNames = activeChallenges.map((c) => c.title).slice(0, 2).join(", ");

  useEffect(() => {
    if (!projectId && projects.length > 0) {
      const saved = localStorage.getItem("lastProjectId");
      const found = saved && projects.find((p) => p.id === saved);
      setProjectId(found ? saved! : projects[0].id);
    }
  }, [projects, projectId]);

  useEffect(() => {
    if (!active?.start_time) {
      setElapsed(0);
      return;
    }
    const startMs = new Date(active.start_time).getTime();
    const baseOffset = (active.paused_seconds || 0) + pausedElapsed;

    if (isPaused) {
      const ref = pauseStartTime ?? Date.now();
      setElapsed(Math.max(0, Math.floor((ref - startMs) / 1000) - baseOffset));
      return;
    }

    const tick = () => {
      const gross = Math.floor((Date.now() - startMs) / 1000);
      setElapsed((prev) => {
        const next = Math.max(0, gross - baseOffset);
        return next < prev ? prev : next;
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active?.start_time, active?.paused_seconds, isPaused, pausedElapsed, pauseStartTime]);

  const isActiveInThisRoom = !!active && (active as any).room_id === roomId;
  const isActiveElsewhere = !!active && !isActiveInThisRoom;
  const otherRoomId = isActiveElsewhere ? (active as any).room_id : null;

  const handleStart = () => {
    if (!projectId) return;
    resetPause();
    localStorage.setItem("lastProjectId", projectId);
    start.mutate({ projectId, roomId });
  };

  const handleStop = () => {
    if (!active) return;
    stop.mutate(
      { entryId: active.id, roomId, clientSeconds: elapsed },
      { onSuccess: () => resetPause() },
    );
    setFsOpen(false);
  };

  const handlePauseToggle = () => {
    if (isPaused) resume();
    else pause();
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card text-card-foreground shadow-lg shadow-primary/10 p-4 sm:p-5 space-y-4">
      {/* Accent strip */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-11 w-11 rounded-xl bg-primary/10 ring-1 ring-primary/30 flex items-center justify-center shrink-0">
            <TimerIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-foreground truncate leading-tight">
              {t("rooms.room_timer_title", "Timer da Sala")}
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
              {t("rooms.room_timer_desc", "Use o timer junto com a sala e conte para o ranking e desafios")}
            </p>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => setShowSounds((v) => !v)}
          aria-label={t("rooms.room_timer_sounds", "Sons ambientes")}
        >
          <Music2 className="h-4 w-4" />
        </Button>
      </div>


      {isActiveInThisRoom ? (
        <div className="space-y-3">
          <div className="text-center py-2">
            <div className={cn(
              "text-4xl sm:text-5xl font-mono font-bold tabular-nums tracking-tight transition-colors",
              isPaused ? "text-warning" : "text-primary"
            )}>
              {fmt(elapsed)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {(active as any)?.project?.name || ""}
            </p>
          </div>

          {/* Status chips: counting / paused + challenge */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {isPaused ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 text-warning border border-warning/40 px-2 py-0.5 text-[11px] font-medium">
                <Pause className="h-3 w-3" />
                {t("rooms.room_timer_paused", "Pausado")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/30 px-2 py-0.5 text-[11px] font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                {t("rooms.room_timer_counting_here", "Contando para esta sala")}
              </span>
            )}
            {hasChallenge && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 text-[11px] font-medium">
                <Trophy className="h-3 w-3" />
                {t("rooms.room_timer_counts_challenge", "+ desafio")}: {challengeNames}
              </span>
            )}
          </div>

          {/* Action row: Pause/Resume · Fullscreen · Stop
              Mobile: 2 rows (pause full-width, then [fullscreen | stop])
              ≥sm: single row 3 columns */}
          <div className="grid grid-cols-2 sm:grid-cols-[1fr_auto_1fr] gap-2">
            <Button
              variant="outline"
              size="lg"
              className="font-semibold col-span-2 sm:col-span-1 min-w-0"
              onClick={handlePauseToggle}
            >
              {isPaused ? (
                <><Play className="h-4 w-4 mr-2 shrink-0" /><span className="truncate">{t("timer.resume", "Retomar")}</span></>
              ) : (
                <><Pause className="h-4 w-4 mr-2 shrink-0" /><span className="truncate">{t("timer.pause", "Pausar")}</span></>
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-3"
              onClick={() => setFsOpen(true)}
              aria-label={t("timer.fullscreen", "Tela cheia")}
              title={t("timer.fullscreen", "Tela cheia")}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="destructive"
              className="font-semibold min-w-0"
              onClick={handleStop}
              disabled={stop.isPending}
            >
              <Square className="h-4 w-4 mr-2 shrink-0" />
              <span className="truncate">{t("rooms.room_timer_stop", "Parar")}</span>
            </Button>
          </div>
        </div>
      ) : isActiveElsewhere ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                <p className="font-semibold mb-0.5">
                  {t("rooms.room_timer_elsewhere_title", "Cronômetro ativo em outro lugar")}
                </p>
                <p>
                  {t(
                    "rooms.room_timer_elsewhere_desc",
                    "Esse tempo NÃO está contando para esta sala. Pare o cronômetro atual e inicie aqui para contabilizar.",
                  )}
                </p>
              </div>
            </div>
            <div className="text-center font-mono text-2xl font-bold text-amber-700 dark:text-amber-300 tabular-nums">
              {fmt(elapsed)}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => navigate(otherRoomId ? `/rooms/${otherRoomId}` : "/")}
          >
            <ArrowRight className="h-3.5 w-3.5 mr-2" />
            {otherRoomId
              ? t("rooms.room_timer_go_to_other_room", "Ir para o cronômetro ativo")
              : t("rooms.room_timer_go_to_dashboard", "Ir para o cronômetro")}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <ProjectPicker
            value={projectId}
            onValueChange={setProjectId}
            projects={projects}
            placeholder={t("timer.select_project", "Escolher projeto")}
          />
          <Button
            size="lg"
            className="w-full font-semibold text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
            onClick={handleStart}
            disabled={!projectId || start.isPending}
          >
            <Play className="h-4 w-4 mr-2" />
            {t("rooms.room_timer_start", "Iniciar nesta sala")}
          </Button>

          {/* Helper text — what counts */}
          <div className="flex items-start gap-1.5 rounded-md bg-muted/40 border border-border/60 px-2.5 py-2 text-[11px] text-muted-foreground leading-relaxed">
            <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <span>
              {hasChallenge
                ? t(
                    "rooms.room_timer_helper_with_challenge",
                    "Ao iniciar aqui, seu tempo conta para o ranking, o streak desta sala e para o desafio: {{names}}.",
                    { names: challengeNames },
                  )
                : t(
                    "rooms.room_timer_helper_room_only",
                    "Ao iniciar aqui, seu tempo conta para o ranking e o streak desta sala.",
                  )}
            </span>
          </div>

          {projects.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center">
              {t("timer.no_projects", "Crie um projeto primeiro")}
            </p>
          )}
        </div>
      )}

      {showSounds && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 justify-start"
              onClick={() => ambient.toggle()}
            >
              {ambient.isPlaying ? <VolumeX className="h-3.5 w-3.5 mr-2" /> : <Volume2 className="h-3.5 w-3.5 mr-2" />}
              <span className="truncate text-xs">
                {ambient.currentSound ? t(ambient.currentSound.nameKey) : t("rooms.room_timer_pick_sound", "Escolher som")}
              </span>
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ambient.sounds.slice(0, 8).map((s) => (
              <button
                key={s.id}
                onClick={() => ambient.play(s.id)}
                className={cn(
                  "text-[11px] px-2 py-1 rounded-md border transition-colors",
                  ambient.currentSound?.id === s.id
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "bg-background border-border hover:bg-accent",
                )}
              >
                {t(s.nameKey)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
            <Slider
              value={[ambient.volume * 100]}
              onValueChange={(v) => ambient.setVolume(v[0] / 100)}
              max={100}
              step={1}
              className="flex-1"
            />
          </div>
        </div>
      )}

      {fsOpen && isActiveInThisRoom && (
        <FullscreenTimer
          mode="normal"
          elapsed={elapsed}
          onClose={() => setFsOpen(false)}
          onPause={pause}
          onResume={resume}
          onStop={handleStop}
        />
      )}
    </div>
  );
}
