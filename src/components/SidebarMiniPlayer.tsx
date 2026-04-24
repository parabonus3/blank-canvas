import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAmbientSoundContext } from '@/contexts/AmbientSoundContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { FREE_SOUNDS } from '@/lib/stripePlans';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Music, Play, Pause, Volume2, VolumeX, Loader2, Lock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AmbientSound } from '@/lib/sounds';

export function SidebarMiniPlayer() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const { tier } = useSubscription();
  const [pickerOpen, setPickerOpen] = useState(false);

  const {
    currentSound,
    isPlaying,
    volume,
    isLoading,
    play,
    pause,
    setVolume,
    sounds,
  } = useAmbientSoundContext();

  const isSoundLocked = (id: string) => tier === 'free' && !FREE_SOUNDS.includes(id);

  const handleToggle = () => {
    if (isPlaying) {
      pause();
    } else if (currentSound) {
      play(currentSound.id);
    }
  };

  const handleSelect = (sound: AmbientSound) => {
    if (isSoundLocked(sound.id)) return;
    if (currentSound?.id === sound.id && isPlaying) {
      pause();
    } else {
      play(sound.id);
    }
    setPickerOpen(false);
  };

  const getSoundName = (sound: AmbientSound) => t(sound.nameKey);

  const categories = ['noise', 'nature', 'environment', 'music'] as const;

  // Collapsed: just icon with playing indicator
  if (isCollapsed) {
    return (
      <div className="flex justify-center py-2">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Music className="h-5 w-5" />
              {isPlaying && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="w-64 p-0">
            <SoundPickerContent
              sounds={sounds}
              categories={categories}
              currentSound={currentSound}
              isPlaying={isPlaying}
              isLoading={isLoading}
              isSoundLocked={isSoundLocked}
              getSoundName={getSoundName}
              onSelect={handleSelect}
              volume={volume}
              setVolume={setVolume}
              onToggle={handleToggle}
              t={t}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Expanded sidebar
  return (
    <div className="px-3 py-2">
      <div className="rounded-lg border border-border bg-card/50 p-2.5 space-y-2">
        {/* Header row */}
        <div className="flex items-center gap-2">
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 flex-1 min-w-0 text-left hover:bg-muted/50 rounded-md px-1.5 py-1 transition-colors">
                <Music className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium truncate">
                  {currentSound ? (
                    <span className="flex items-center gap-1">
                      <span>{currentSound.icon}</span>
                      <span className="truncate">{getSoundName(currentSound)}</span>
                    </span>
                  ) : (
                    t('sounds.title')
                  )}
                </span>
                {isPlaying && (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                )}
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0 ms-auto" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-64 p-0">
              <SoundPickerContent
                sounds={sounds}
                categories={categories}
                currentSound={currentSound}
                isPlaying={isPlaying}
                isLoading={isLoading}
                isSoundLocked={isSoundLocked}
                getSoundName={getSoundName}
                onSelect={handleSelect}
                volume={volume}
                setVolume={setVolume}
                onToggle={handleToggle}
                t={t}
              />
            </PopoverContent>
          </Popover>

          {/* Play/Pause */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={handleToggle}
            disabled={!currentSound || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Volume slider */}
        <div className="flex items-center gap-2">
          <button onClick={() => setVolume(volume > 0 ? 0 : 0.5)} className="shrink-0">
            {volume === 0 ? (
              <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
          <Slider
            value={[volume]}
            onValueChange={(v) => setVolume(v[0])}
            max={1}
            step={0.01}
            className="flex-1"
          />
          <span className="text-[10px] text-muted-foreground w-7 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// Sound picker popover content
function SoundPickerContent({
  sounds,
  categories,
  currentSound,
  isPlaying,
  isLoading,
  isSoundLocked,
  getSoundName,
  onSelect,
  volume,
  setVolume,
  onToggle,
  t,
}: {
  sounds: AmbientSound[];
  categories: readonly ('noise' | 'nature' | 'environment' | 'music')[];
  currentSound: AmbientSound | null;
  isPlaying: boolean;
  isLoading: boolean;
  isSoundLocked: (id: string) => boolean;
  getSoundName: (s: AmbientSound) => string;
  onSelect: (s: AmbientSound) => void;
  volume: number;
  setVolume: (v: number) => void;
  onToggle: () => void;
  t: (key: string) => string;
}) {
  const categoryLabels: Record<string, string> = {
    noise: t('sounds.category_noise') || '📻 Noise',
    nature: t('sounds.category_nature') || '🌿 Nature',
    environment: t('sounds.category_environment') || '🏠 Environment',
    music: t('sounds.category_music') || '🎵 Music',
  };

  return (
    <div className="p-2">
      <ScrollArea className="h-[280px]">
        <div className="space-y-3">
          {categories.map((cat) => {
            const catSounds = sounds.filter((s) => s.category === cat);
            if (!catSounds.length) return null;
            return (
              <div key={cat}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                  {categoryLabels[cat]}
                </p>
                <div className="space-y-0.5">
                  {catSounds.map((sound) => {
                    const isSelected = currentSound?.id === sound.id;
                    const locked = isSoundLocked(sound.id);
                    return (
                      <button
                        key={sound.id}
                        onClick={() => onSelect(sound)}
                        disabled={locked}
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left',
                          locked && 'opacity-40 cursor-not-allowed',
                          isSelected && isPlaying
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        <span className="text-base">{sound.icon}</span>
                        <span className="truncate flex-1">{getSoundName(sound)}</span>
                        {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                        {isSelected && isPlaying && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Volume at bottom */}
      <div className="border-t border-border mt-2 pt-2 flex items-center gap-2">
        <button onClick={onToggle} disabled={!currentSound} className="shrink-0">
          {isPlaying ? (
            <Pause className="h-4 w-4 text-primary" />
          ) : (
            <Play className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <Slider
          value={[volume]}
          onValueChange={(v) => setVolume(v[0])}
          max={1}
          step={0.01}
          className="flex-1"
        />
        <span className="text-[10px] text-muted-foreground w-7 text-right">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
}
