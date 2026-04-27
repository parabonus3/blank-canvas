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

// Pool de instâncias por som. Usar várias instâncias evita problemas de
// "som não toca de novo enquanto o anterior ainda está reproduzindo" e
// permite sobreposição (ex.: vários joins seguidos).
const POOL_SIZE = 4;
const pools: Partial<Record<SoundKey, HTMLAudioElement[]>> = {};
const poolIndex: Partial<Record<SoundKey, number>> = {};
const lastPlayedAt: Partial<Record<SoundKey, number>> = {};
const THROTTLE_MS = 80;

function getPool(key: SoundKey): HTMLAudioElement[] | null {
  if (typeof window === "undefined") return null;
  let pool = pools[key];
  if (!pool) {
    pool = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const a = new Audio(SOUND_URLS[key]);
      a.preload = "auto";
      try { a.load(); } catch {}
      pool.push(a);
    }
    pools[key] = pool;
    poolIndex[key] = 0;
  }
  return pool;
}

// Pré-aquece todos os sons no primeiro import (evita atraso na 1ª reprodução).
if (typeof window !== "undefined") {
  (Object.keys(SOUND_URLS) as SoundKey[]).forEach((k) => getPool(k));
}

function play(key: SoundKey, baseVolume = 1) {
  if (!getSoundEnabled()) return;
  const now = Date.now();
  const last = lastPlayedAt[key] ?? 0;
  if (now - last < THROTTLE_MS) return;
  lastPlayedAt[key] = now;

  const pool = getPool(key);
  if (!pool) return;

  // Round-robin pelo pool — cada chamada usa a próxima instância,
  // permitindo overlap e evitando o estado "playing" de uma instância
  // travar uma nova reprodução.
  const idx = (poolIndex[key] ?? 0) % pool.length;
  poolIndex[key] = idx + 1;
  const node = pool[idx];

  try {
    // Garante que toca do início mesmo se o nó ainda estava reproduzindo.
    node.pause();
    node.currentTime = 0;
    // Volume global; se estiver em 0 ainda toca de forma audível em volume mínimo
    // para que o usuário perceba (a configuração de "ligado/desligado" é o gate real).
    const vol = baseVolume * getGlobalVolume();
    node.volume = Math.max(0.05, Math.min(1, vol));
    const promise = node.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch((err) => {
        // Logar para diagnóstico em dev — bloqueios de autoplay aparecem aqui.
        if (typeof console !== "undefined") {
          console.warn(`[uiSounds] play(${key}) bloqueado:`, err?.message || err);
        }
      });
    }
  } catch (e) {
    if (typeof console !== "undefined") {
      console.warn(`[uiSounds] erro ao tocar ${key}:`, e);
    }
  }
}

export function playLiveChat() { play("live-chat", 0.9); }
export function playPageStart() { play("page", 0.9); }
export function playPauseSound() { play("pause", 0.9); }
export function playStopSound() { play("stop", 0.9); }
