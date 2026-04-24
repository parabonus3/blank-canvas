// Achievement Sound Effects using Web Audio API

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

// Play a sequence of ascending notes for achievement unlock
export function playAchievementSound() {
  try {
    const ctx = getAudioContext();
    
    // Resume if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    // C major arpeggio - pleasant achievement sound
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      const startTime = ctx.currentTime + i * 0.1;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.5);
    });
  } catch (error) {
    console.warn('Could not play achievement sound:', error);
  }
}

// Play a fanfare for phase completion
export function playPhaseCompleteSound() {
  try {
    const ctx = getAudioContext();
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    // Triumphant fanfare sequence
    const fanfare = [
      { freq: 523.25, duration: 0.15, delay: 0 },     // C5
      { freq: 523.25, duration: 0.15, delay: 0.15 },  // C5
      { freq: 523.25, duration: 0.15, delay: 0.3 },   // C5
      { freq: 659.25, duration: 0.2, delay: 0.45 },   // E5
      { freq: 783.99, duration: 0.3, delay: 0.65 },   // G5
      { freq: 1046.50, duration: 0.5, delay: 0.95 },  // C6 (held)
    ];
    
    fanfare.forEach(({ freq, duration, delay }) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.frequency.value = freq;
      oscillator.type = 'triangle'; // Softer sound for fanfare
      
      const startTime = ctx.currentTime + delay;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration + 0.1);
    });
    
    // Add a subtle shimmer effect
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.frequency.value = 2093; // C7 - high shimmer
    shimmer.type = 'sine';
    
    shimmerGain.gain.setValueAtTime(0, ctx.currentTime + 1);
    shimmerGain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 1.1);
    shimmerGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.8);
    
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    
    shimmer.start(ctx.currentTime + 1);
    shimmer.stop(ctx.currentTime + 2);
    
  } catch (error) {
    console.warn('Could not play phase complete sound:', error);
  }
}

// Play a level up sound - quick ascending tone
export function playLevelUpSound() {
  try {
    const ctx = getAudioContext();
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'sine';
    
    // Quick sweep from low to high
    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.25);
  } catch (error) {
    console.warn('Could not play level up sound:', error);
  }
}

// Play a subtle "ding" for small milestones
export function playMilestoneDing() {
  try {
    const ctx = getAudioContext();
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.frequency.value = 880; // A5
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.35);
  } catch (error) {
    console.warn('Could not play milestone ding:', error);
  }
}
