// Reproduz arquivos MP3 curtos para eventos da UI (start, pause, stop, live-chat).
// Respeita o flag global de som (mesmo usado em soundEffects.ts) e o volume global.

import { getSoundEnabled, getGlobalVolume } from "./soundEffects";

type SoundKey = "live-chat" | "page" | "pause" | "stop";

const SOUND_URLS: Record<SoundKey, string> = {
  "live-chat": "/sounds/live-chat.mp3",
  page: "/sounds/page.mp3",
  pause: "/sounds/pause.mp3",
  stop: "/sounds/stop.mp3",
};

// Pré-carrega uma instância "mestra" por som — usada como template para clonar e permitir overlap.
const masters: Partial<Record<SoundKey, HTMLAudioElement>> = {};
const lastPlayedAt: Partial<Record<SoundKey, number>> = {};
const THROTTLE_MS = 120;

function getMaster(key: SoundKey): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  let m = masters[key];
  if (!m) {
    m = new Audio(SOUND_URLS[key]);
    m.preload = "auto";
    // Carrega para cache
    try { m.load(); } catch {}
    masters[key] = m;
  }
  return m;
}

// Pré-aquece todos os sons no primeiro import (evita atraso na 1ª reprodução).
if (typeof window !== "undefined") {
  (Object.keys(SOUND_URLS) as SoundKey[]).forEach((k) => getMaster(k));
}

function play(key: SoundKey, baseVolume = 1) {
  if (!getSoundEnabled()) return;
  const now = Date.now();
  const last = lastPlayedAt[key] ?? 0;
  if (now - last < THROTTLE_MS) return;
  lastPlayedAt[key] = now;

  const master = getMaster(key);
  if (!master) return;

  try {
    // Clona para permitir disparos sobrepostos (ex.: vários joins seguidos).
    const node = master.cloneNode(true) as HTMLAudioElement;
    node.volume = Math.max(0, Math.min(1, baseVolume * getGlobalVolume()));
    const promise = node.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(() => {
        // Ignora bloqueios de autoplay silenciosamente.
      });
    }
  } catch {
    // silencioso
  }
}

export function playLiveChat() { play("live-chat", 0.9); }
export function playPageStart() { play("page", 0.9); }
export function playPauseSound() { play("pause", 0.9); }
export function playStopSound() { play("stop", 0.9); }
