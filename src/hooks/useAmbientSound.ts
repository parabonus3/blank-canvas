import { useState, useEffect, useRef, useCallback } from 'react';
import { AMBIENT_SOUNDS, getSoundById, type AmbientSound } from '@/lib/sounds';
import { getNoiseGenerator, type GeneratedSoundType } from '@/lib/noiseGenerator';

interface UseAmbientSoundReturn {
  // Estado
  currentSound: AmbientSound | null;
  isPlaying: boolean;
  volume: number;
  isLoading: boolean;
  error: string | null;
  
  // Ações
  play: (soundId: string) => Promise<void>;
  pause: () => void;
  stop: () => void;
  toggle: () => Promise<void>;
  setVolume: (volume: number) => void;
  fadeOut: (duration?: number) => Promise<void>;
  
  // Lista de sons
  sounds: AmbientSound[];
}

export const useAmbientSound = (
  initialSoundId?: string | null,
  initialVolume: number = 0.5
): UseAmbientSoundReturn => {
  const [currentSound, setCurrentSound] = useState<AmbientSound | null>(
    initialSoundId ? getSoundById(initialSoundId) || null : null
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(initialVolume);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const noiseGenerator = useRef(getNoiseGenerator());

  // Limpar ao desmontar
  useEffect(() => {
    return () => {
      noiseGenerator.current.stop();
    };
  }, []);

  // Atualizar volume quando muda
  useEffect(() => {
    if (noiseGenerator.current.getIsPlaying()) {
      noiseGenerator.current.setVolume(volume);
    }
  }, [volume]);

  const stopCurrentPlayback = useCallback(() => {
    noiseGenerator.current.stop();
    setIsPlaying(false);
  }, []);

  const play = useCallback(async (soundId: string) => {
    const sound = getSoundById(soundId);
    if (!sound) {
      console.error('Som não encontrado:', soundId);
      return;
    }

    // Parar qualquer som atual
    stopCurrentPlayback();
    setCurrentSound(sound);
    setIsLoading(true);
    setError(null);

    try {
      // Verificar tipo de fonte do som
      if (sound.sourceType === 'file' && sound.fileUrl) {
        // Reproduzir arquivo de áudio (MP3)
        await noiseGenerator.current.playFromUrl(sound.fileUrl, volume);
      } else if (sound.generatedType) {
        // Reproduzir som gerado via Web Audio API
        await noiseGenerator.current.play(sound.generatedType as GeneratedSoundType, volume);
      } else {
        throw new Error('Som sem fonte válida configurada');
      }
      setIsPlaying(true);
      setError(null);
    } catch (err) {
      console.error('Erro ao reproduzir som:', err);
      setError('Erro ao reproduzir som. Tente clicar novamente.');
      setIsPlaying(false);
    }
    setIsLoading(false);
  }, [volume, stopCurrentPlayback]);

  const pause = useCallback(() => {
    // Web Audio API não tem pause nativo, então paramos
    if (noiseGenerator.current.getIsPlaying()) {
      noiseGenerator.current.stop();
    }
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    stopCurrentPlayback();
    setCurrentSound(null);
  }, [stopCurrentPlayback]);

  const toggle = useCallback(async () => {
    if (isPlaying) {
      pause();
    } else if (currentSound) {
      await play(currentSound.id);
    }
  }, [isPlaying, currentSound, pause, play]);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
  }, []);

  const fadeOut = useCallback(async (duration: number = 1) => {
    if (noiseGenerator.current.getIsPlaying()) {
      await noiseGenerator.current.fadeOut(duration);
      setIsPlaying(false);
    }
  }, []);

  return {
    currentSound,
    isPlaying,
    volume,
    isLoading,
    error,
    play,
    pause,
    stop,
    toggle,
    setVolume,
    fadeOut,
    sounds: AMBIENT_SOUNDS,
  };
};
