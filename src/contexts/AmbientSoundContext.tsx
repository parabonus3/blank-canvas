import { createContext, useContext, ReactNode } from 'react';
import { useAmbientSound } from '@/hooks/useAmbientSound';
import type { AmbientSound } from '@/lib/sounds';

interface AmbientSoundContextValue {
  currentSound: AmbientSound | null;
  isPlaying: boolean;
  volume: number;
  isLoading: boolean;
  error: string | null;
  play: (soundId: string) => Promise<void>;
  pause: () => void;
  stop: () => void;
  toggle: () => Promise<void>;
  setVolume: (volume: number) => void;
  fadeOut: (duration?: number) => Promise<void>;
  sounds: AmbientSound[];
}

const AmbientSoundContext = createContext<AmbientSoundContextValue | null>(null);

export function AmbientSoundProvider({ children }: { children: ReactNode }) {
  const ambient = useAmbientSound();

  return (
    <AmbientSoundContext.Provider value={ambient}>
      {children}
    </AmbientSoundContext.Provider>
  );
}

export function useAmbientSoundContext() {
  const ctx = useContext(AmbientSoundContext);
  if (!ctx) {
    throw new Error('useAmbientSoundContext must be used within AmbientSoundProvider');
  }
  return ctx;
}
