import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAmbientSoundContext } from '@/contexts/AmbientSoundContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  ChevronDown,
  Music,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AmbientSound } from '@/lib/sounds';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { FREE_SOUNDS } from '@/lib/stripePlans';
import { Lock } from 'lucide-react';

interface AmbientSoundPlayerProps {
  defaultSoundId?: string | null;
  defaultVolume?: number;
  autoPlay?: boolean;
  onSoundChange?: (soundId: string | null) => void;
  onVolumeChange?: (volume: number) => void;
  compact?: boolean;
  className?: string;
}

// Store individual volumes in localStorage
const VOLUMES_KEY = 'ambient-sound-volumes';

const getStoredVolumes = (): Record<string, number> => {
  try {
    const stored = localStorage.getItem(VOLUMES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const setStoredVolume = (soundId: string, volume: number) => {
  const volumes = getStoredVolumes();
  volumes[soundId] = volume;
  localStorage.setItem(VOLUMES_KEY, JSON.stringify(volumes));
};

export const AmbientSoundPlayer = ({
  defaultSoundId,
  defaultVolume = 0.5,
  autoPlay = false,
  onSoundChange,
  onVolumeChange,
  compact = false,
  className,
}: AmbientSoundPlayerProps) => {
  const { t } = useTranslation();
  const { tier } = useSubscription();
  const [isOpen, setIsOpen] = useState(!compact);
  const [individualVolumes, setIndividualVolumes] = useState<Record<string, number>>(getStoredVolumes);
  
  const isSoundLocked = (soundId: string) => tier === 'free' && !FREE_SOUNDS.includes(soundId);
  
  const {
    currentSound,
    isPlaying,
    volume,
    isLoading,
    error,
    play,
    pause,
    stop,
    setVolume,
    sounds,
  } = useAmbientSoundContext();

  // Get translated sound name
  const getSoundName = (sound: AmbientSound): string => {
    return t(sound.nameKey);
  };

  // Get individual volume for a sound
  const getSoundVolume = (soundId: string): number => {
    return individualVolumes[soundId] ?? 0.5;
  };

  // Set individual volume for a sound
  const handleIndividualVolumeChange = (soundId: string, newVolume: number) => {
    setIndividualVolumes(prev => ({ ...prev, [soundId]: newVolume }));
    setStoredVolume(soundId, newVolume);
    
    // If this is the current sound, update the actual volume
    if (currentSound?.id === soundId) {
      setVolume(newVolume);
    }
  };

  const handleSoundSelect = (sound: AmbientSound) => {
    if (isSoundLocked(sound.id)) return;
    if (currentSound?.id === sound.id && isPlaying) {
      pause();
    } else {
      // Use individual volume for this sound
      const soundVolume = getSoundVolume(sound.id);
      setVolume(soundVolume);
      play(sound.id);
      onSoundChange?.(sound.id);
    }
  };

  const handleMasterVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    
    // Also update individual volume for current sound
    if (currentSound) {
      handleIndividualVolumeChange(currentSound.id, newVolume);
    }
    
    onVolumeChange?.(newVolume);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      pause();
    } else if (currentSound) {
      play(currentSound.id);
    }
  };

  // Compact mode (collapsed)
  if (compact && !isOpen) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-lg bg-card border border-border",
        className
      )}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="h-8 w-8"
        >
          <Music className="h-4 w-4" />
        </Button>
        
        {currentSound && (
          <>
            <span className="text-sm">{currentSound.icon}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleTogglePlay}
              disabled={isLoading}
              className="h-8 w-8"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={setIsOpen}
      className={cn("w-full", className)}
    >
      <div className="rounded-lg bg-card border border-border overflow-hidden">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{t('sounds.title')}</span>
              {currentSound && isPlaying && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  {currentSound.icon} {getSoundName(currentSound)}
                </span>
              )}
              {error && (
                <span className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {t('sounds.error')}
                </span>
              )}
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform text-muted-foreground",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-4">
            {/* Error message */}
            {error && (
              <div className="text-xs text-destructive bg-destructive/10 p-2 rounded flex items-center gap-2">
                <AlertCircle className="h-3 w-3" />
                {error}
              </div>
            )}
            
            {/* Lista de sons com volume individual */}
            <ScrollArea className="h-[200px] sm:h-[240px] md:h-[280px] pr-3">
              <div className="space-y-1">
                {sounds.map((sound) => {
                  const isSelected = currentSound?.id === sound.id;
                  const soundVolume = getSoundVolume(sound.id);
                  const locked = isSoundLocked(sound.id);
                  
                  return (
                    <div
                      key={sound.id}
                      className={cn(
                        "rounded-md transition-all border",
                        locked && "opacity-50",
                        isSelected && isPlaying
                          ? "bg-primary/10 border-primary"
                          : "border-transparent hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2 p-2">
                        <button
                          onClick={() => handleSoundSelect(sound)}
                          disabled={(isLoading && isSelected) || locked}
                          className="flex items-center gap-2 flex-1 text-left"
                        >
                          <span className="text-lg">{sound.icon}</span>
                          <span className={cn(
                            "text-sm truncate flex-1",
                            isSelected && isPlaying && "text-primary font-medium"
                          )}>
                            {getSoundName(sound)}
                          </span>
                          {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                          {isLoading && isSelected && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                          {!isLoading && isSelected && isPlaying && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                          )}
                        </button>
                        
                        {/* Individual volume slider */}
                        <div className="flex items-center gap-2 w-24">
                          <Slider
                            value={[soundVolume]}
                            onValueChange={(v) => handleIndividualVolumeChange(sound.id, v[0])}
                            max={1}
                            step={0.01}
                            className="flex-1"
                          />
                          <span className="text-xs text-muted-foreground w-8 text-right">
                            {Math.round(soundVolume * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Master volume controls */}
            <div className="flex items-center gap-3 pt-2 border-t border-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setVolume(volume > 0 ? 0 : 0.5)}
                className="h-8 w-8 shrink-0"
              >
                {volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              
              <Slider
                value={[volume]}
                onValueChange={handleMasterVolumeChange}
                max={1}
                step={0.01}
                className="flex-1"
              />
              
              <span className="text-xs text-muted-foreground w-10 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>

            {/* Play/Pause button */}
            {currentSound && (
              <div className="flex gap-2">
                <Button
                  variant={isPlaying ? "default" : "outline"}
                  size="sm"
                  onClick={handleTogglePlay}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('sounds.loading')}
                    </>
                  ) : isPlaying ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      {t('sounds.pause')}
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      {t('sounds.play')}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
