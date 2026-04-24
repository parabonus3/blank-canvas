// Centralized Sound Effects System using Web Audio API
// All sounds are generated programmatically — zero external files needed

let audioContext: AudioContext | null = null;
let globalVolume = 0.5;
let soundEnabled = true;

function getCtx(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

export function setSoundVolume(v: number) {
  globalVolume = Math.max(0, Math.min(1, v));
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

function gain(ctx: AudioContext, volume: number): GainNode {
  const g = ctx.createGain();
  g.gain.value = volume * globalVolume;
  return g;
}

// ─── Chat Sounds ──────────────────────────────────────────

/** Soft double-pop "bloop" — new message from someone else */
export function playMessageReceived() {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = gain(ctx, 0.15);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.08;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.15 * globalVolume, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(g).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  } catch (e) { console.warn('Sound error:', e); }
}

/** Quick subtle whoosh — message sent by me */
export function playMessageSent() {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = gain(ctx, 0.1);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
    g.gain.setValueAtTime(0.1 * globalVolume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) { console.warn('Sound error:', e); }
}

// ─── Room Presence Sounds ─────────────────────────────────

/** Warm ascending ding — member joined */
export function playMemberJoined() {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = gain(ctx, 0.12);
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = now + i * 0.1;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12 * globalVolume, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  } catch (e) { console.warn('Sound error:', e); }
}

/** Soft descending tone — member left */
export function playMemberLeft() {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = gain(ctx, 0.08);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.25);
    g.gain.setValueAtTime(0.08 * globalVolume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) { console.warn('Sound error:', e); }
}

// ─── Focus / Timer Sounds ─────────────────────────────────

/** Meditation bell — focus session start */
export function playFocusStart() {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Bell strike
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 830;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.25 * globalVolume, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.6);

    // Harmonic overtone
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 1660;
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(0.08 * globalVolume, now + 0.005);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc2.connect(g2).connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.9);
  } catch (e) { console.warn('Sound error:', e); }
}

/** Gong + shimmer — focus session end */
export function playFocusEnd() {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Low gong
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 220;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.3 * globalVolume, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, now + 2);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 2.1);

    // Shimmer
    const sh = ctx.createOscillator();
    const sg = ctx.createGain();
    sh.type = 'sine';
    sh.frequency.value = 1320;
    sg.gain.setValueAtTime(0, now + 0.3);
    sg.gain.linearRampToValueAtTime(0.06 * globalVolume, now + 0.4);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    sh.connect(sg).connect(ctx.destination);
    sh.start(now + 0.3);
    sh.stop(now + 1.6);
  } catch (e) { console.warn('Sound error:', e); }
}

/** Subtle tick — last seconds of timer */
export function playTimerTick() {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1000;
    g.gain.setValueAtTime(0.08 * globalVolume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  } catch (e) { console.warn('Sound error:', e); }
}

// ─── UI Feedback Sounds ───────────────────────────────────

/** Micro click for important actions */
export function playButtonClick() {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 1200;
    g.gain.setValueAtTime(0.04 * globalVolume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  } catch (e) { console.warn('Sound error:', e); }
}

/** Positive chime — success */
export function playSuccess() {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    [523.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.12;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.15 * globalVolume, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(g).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch (e) { console.warn('Sound error:', e); }
}

/** Short negative buzz — error */
export function playError() {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 200;
    g.gain.setValueAtTime(0.1 * globalVolume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  } catch (e) { console.warn('Sound error:', e); }
}

// ─── Timer Pause / Resume ─────────────────────────────────

/** Soft descending two-tone — timer paused */
export function playTimerPause() {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    [520, 380].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.1;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12 * globalVolume, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(g).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  } catch (e) { console.warn('Sound error:', e); }
}

/** Quick ascending two-tone — timer resumed */
export function playTimerResume() {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    [440, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.09;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.14 * globalVolume, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(g).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  } catch (e) { console.warn('Sound error:', e); }
}
