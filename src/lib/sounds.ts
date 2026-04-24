// Catálogo de sons ambientes para foco
// Suporta sons gerados via Web Audio API e arquivos de áudio externos

import type { GeneratedSoundType } from './noiseGenerator';

export interface AmbientSound {
  id: string;
  nameKey: string; // i18n translation key
  icon: string;
  category: 'nature' | 'noise' | 'environment' | 'music';
  // Tipo de fonte do som
  sourceType: 'generated' | 'file';
  // Para sons gerados via Web Audio API
  generatedType?: GeneratedSoundType;
  // Para sons de arquivo (MP3)
  fileUrl?: string;
}

// Sons ambientes disponíveis
export const AMBIENT_SOUNDS: AmbientSound[] = [
  // Ruídos - arquivos MP3
  {
    id: 'white-noise',
    nameKey: 'sounds.white_noise',
    icon: '📻',
    category: 'noise',
    sourceType: 'file',
    fileUrl: '/sounds/white-noise.mp3',
  },
  {
    id: 'brown-noise',
    nameKey: 'sounds.brown_noise',
    icon: '🔊',
    category: 'noise',
    sourceType: 'file',
    fileUrl: '/sounds/brown-noise.mp3',
  },
  {
    id: 'pink-noise',
    nameKey: 'sounds.pink_noise',
    icon: '🎀',
    category: 'noise',
    sourceType: 'generated',
    generatedType: 'pink',
  },
  // Sons naturais - arquivos MP3
  {
    id: 'rain',
    nameKey: 'sounds.rain',
    icon: '🌧️',
    category: 'nature',
    sourceType: 'file',
    fileUrl: '/sounds/rain.mp3',
  },
  {
    id: 'thunder-rain',
    nameKey: 'sounds.thunder_rain',
    icon: '⛈️',
    category: 'nature',
    sourceType: 'file',
    fileUrl: '/sounds/thunder-rain.mp3',
  },
  {
    id: 'ocean-waves',
    nameKey: 'sounds.ocean_waves',
    icon: '🌊',
    category: 'nature',
    sourceType: 'file',
    fileUrl: '/sounds/ocean-waves.mp3',
  },
  {
    id: 'forest',
    nameKey: 'sounds.forest',
    icon: '🌲',
    category: 'nature',
    sourceType: 'file',
    fileUrl: '/sounds/forest.mp3',
  },
  {
    id: 'birds',
    nameKey: 'sounds.birds',
    icon: '🐦',
    category: 'nature',
    sourceType: 'file',
    fileUrl: '/sounds/birds.mp3',
  },
  {
    id: 'fireplace',
    nameKey: 'sounds.fireplace',
    icon: '🔥',
    category: 'environment',
    sourceType: 'file',
    fileUrl: '/sounds/fireplace.mp3',
  },
  {
    id: 'wind',
    nameKey: 'sounds.wind',
    icon: '🌬️',
    category: 'environment',
    sourceType: 'file',
    fileUrl: '/sounds/wind.mp3',
  },
  {
    id: 'night-crickets',
    nameKey: 'sounds.night_crickets',
    icon: '🦗',
    category: 'nature',
    sourceType: 'file',
    fileUrl: '/sounds/night-crickets.mp3',
  },
  {
    id: 'river',
    nameKey: 'sounds.river',
    icon: '🏞️',
    category: 'nature',
    sourceType: 'file',
    fileUrl: '/sounds/river.mp3',
  },
  // Músicas Lo-fi
  {
    id: 'lofi-1',
    nameKey: 'sounds.lofi_1',
    icon: '🎵',
    category: 'music',
    sourceType: 'file',
    fileUrl: '/sounds/lofi-1.mp3',
  },
  {
    id: 'lofi-2',
    nameKey: 'sounds.lofi_2',
    icon: '🎶',
    category: 'music',
    sourceType: 'file',
    fileUrl: '/sounds/lofi-2.mp3',
  },
  {
    id: 'lofi-3',
    nameKey: 'sounds.lofi_3',
    icon: '🎧',
    category: 'music',
    sourceType: 'file',
    fileUrl: '/sounds/lofi-3.mp3',
  },
  {
    id: 'relaxing-sleep-2',
    nameKey: 'sounds.relaxing_sleep_2',
    icon: '😴',
    category: 'music',
    sourceType: 'file',
    fileUrl: '/sounds/relaxing-sleep-2.mp3',
  },
  {
    id: 'relaxing-sleep-4',
    nameKey: 'sounds.relaxing_sleep_4',
    icon: '🌙',
    category: 'music',
    sourceType: 'file',
    fileUrl: '/sounds/relaxing-sleep-4.mp3',
  },
  {
    id: 'relaxation',
    nameKey: 'sounds.relaxation',
    icon: '🧘',
    category: 'music',
    sourceType: 'file',
    fileUrl: '/sounds/relaxation.mp3',
  },
  {
    id: 'relaxing-sleep-11',
    nameKey: 'sounds.relaxing_sleep_11',
    icon: '💤',
    category: 'music',
    sourceType: 'file',
    fileUrl: '/sounds/relaxing-sleep-11.mp3',
  },
];

export const getSoundById = (id: string): AmbientSound | undefined => {
  return AMBIENT_SOUNDS.find(sound => sound.id === id);
};

export const getSoundsByCategory = (category: AmbientSound['category']): AmbientSound[] => {
  return AMBIENT_SOUNDS.filter(sound => sound.category === category);
};
