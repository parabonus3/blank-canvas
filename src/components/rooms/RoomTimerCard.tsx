import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, Square, Timer as TimerIcon, Music2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ProjectPicker } from "@/components/ProjectPicker";
import { useProjects } from "@/hooks/useProjects";
import { useActiveTimeEntry, useStartTimer, useStopTimer } from "@/hooks/useTimeEntries";
import { useAmbientSoundContext } from "@/contexts/AmbientSoundContext";
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
  const { data: projects = [] } = useProjects();
  const { data: active } = useActiveTimeEntry();
  const start = useStartTimer();
  const stop = useStopTimer();

  const [projectId, setProjectId] = useState<string>("");
  const [elapsed, setElapsed] = useState(0);
  const [showSounds, setShowSounds] = useState(false);

  const ambient = useAmbientSoundContext();

  // Default project = last used or first
  useEffect(() => {
    if (!projectId && projects.length > 0) {
      const saved = localStorage.getItem("lastProjectId");
      const found = saved && projects.find((p) => p.id === saved);
      setProjectId(found ? saved! : projects[0].id);
    }
  }, [projects, projectId]);

  // Live elapsed counter for active session
  useEffect(() => {
    if (!active?.start_time) {
      setElapsed(0);
      return;
    }
    const tick = () => {
      const s = Math.max(
        0,
        Math.floor((Date.now() - new Date(active.start_time).getTime()) / 1000) -
          (active.paused_seconds || 0),
      );
      setElapsed(s);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active?.start_time, active?.paused_seconds]);

  const isActiveInThisRoom = !!active && (active as any).room_id === roomId;
  const isActiveElsewhere = !!active && !isActiveInThisRoom;

  const handleStart = () => {
    if (!projectId) return;
    localStorage.setItem("lastProjectId", projectId);
    start.mutate({ projectId, roomId });
  };

  const handleStop = () => {
    if (!active) return;
    stop.mutate({ entryId: active.id, roomId, clientSeconds: elapsed });
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/15 via-background to-background p-4 sm:p-5 space-y-4 shadow-lg">
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background:
            "radial-gradient(800px circle at 0% 0%, hsl(var(--primary) / 0.25), transparent 50%)",
        }}
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <TimerIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate">{t("rooms.room_timer_title", "Timer da Sala")}</h3>
              <p className="text-[11px] text-muted-foreground truncate">
                {t("rooms.room_timer_desc", "Estude com a sala e conte para o ranking e desafios")}
              </p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => setShowSounds((v) => !v)}
            aria-label={t("rooms.room_timer_sounds", "Sons ambientes")}
          >
            <Music2 className="h-4 w-4" />
          </Button>
        </div>

        {isActiveInThisRoom ? (
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-mono font-bold text-primary tabular-nums">
                {fmt(elapsed)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {(active as any)?.project?.name || ""}
              </p>
            </div>
            <Button
              size="lg"
              variant="destructive"
              className="w-full"
              onClick={handleStop}
              disabled={stop.isPending}
            >
              <Square className="h-4 w-4 mr-2" />
              {t("rooms.room_timer_stop", "Parar")}
            </Button>
          </div>
        ) : isActiveElsewhere ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
            {t(
              "rooms.room_timer_active_elsewhere",
              "Você já tem um cronômetro ativo em outro lugar. Pare-o para iniciar nesta sala.",
            )}
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
              className={cn(
                "w-full font-semibold text-base",
                "bg-gradient-to-r from-primary to-primary/80 hover:opacity-90",
              )}
              onClick={handleStart}
              disabled={!projectId || start.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              {t("rooms.room_timer_start", "Iniciar nesta sala")}
            </Button>
            {projects.length === 0 && (
              <p className="text-[11px] text-muted-foreground text-center">
                {t("timer.no_projects", "Crie um projeto primeiro")}
              </p>
            )}
          </div>
        )}

        {showSounds && (
          <div className="mt-3 rounded-lg border border-border/60 bg-card/60 p-3 space-y-2">
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
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : "bg-muted/40 border-border hover:bg-muted",
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
      </div>
    </div>
  );
}
