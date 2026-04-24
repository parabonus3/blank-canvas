// Gerador de sons ambientes usando Web Audio API
// Gera ruídos e sons naturais programaticamente sem dependências externas

export type NoiseType = 'white' | 'brown' | 'pink';
export type NaturalSoundType = 'rain' | 'thunder-rain' | 'ocean-waves' | 'wind' | 'fireplace' | 'forest' | 'birds' | 'night-crickets' | 'river';
export type GeneratedSoundType = NoiseType | NaturalSoundType;

export class NoiseGenerator {
  private audioContext: AudioContext | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private additionalGains: GainNode[] = [];
  private isPlaying = false;
  private audioElement: HTMLAudioElement | null = null;

  constructor() {
    // AudioContext será criado sob demanda (após interação do usuário)
  }

  private async initAudioContext(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Garantir que o AudioContext está ativo (requer interação do usuário)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  private createNoiseBuffer(type: NoiseType, duration: number = 10): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');

    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, bufferSize, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);

      switch (type) {
        case 'white':
          this.generateWhiteNoise(channelData);
          break;
        case 'brown':
          this.generateBrownNoise(channelData);
          break;
        case 'pink':
          this.generatePinkNoise(channelData);
          break;
      }
    }

    return buffer;
  }

  private generateWhiteNoise(data: Float32Array): void {
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  private generateBrownNoise(data: Float32Array): void {
    let lastOut = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }
  }

  private generatePinkNoise(data: Float32Array): void {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11;
      b6 = white * 0.115926;
    }
  }

  // Gera buffer de chuva: ruído rosa filtrado com gotas aleatórias
  private createRainBuffer(duration: number = 10): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, bufferSize, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      
      // Base: ruído rosa filtrado
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        let pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        b6 = white * 0.115926;
        
        // Gotas de chuva aleatórias (cliques suaves)
        if (Math.random() < 0.002) {
          pink += (Math.random() - 0.5) * 0.5;
        }
        
        data[i] = pink * 0.25; // Volume aumentado de 0.08 para 0.25
      }
    }

    return buffer;
  }

  // Gera buffer de chuva com trovões
  private createThunderRainBuffer(duration: number = 15): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, bufferSize, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      
      // Chuva base
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      
      // Posições dos trovões (2-3 por ciclo)
      const thunderPositions = [
        Math.floor(bufferSize * 0.2),
        Math.floor(bufferSize * 0.6),
        Math.floor(bufferSize * 0.85)
      ];
      
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        let sample = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.25; // Volume aumentado
        b6 = white * 0.115926;
        
        // Adicionar trovões com envelope
        for (const pos of thunderPositions) {
          const dist = Math.abs(i - pos);
          if (dist < sampleRate * 2) {
            const envelope = Math.exp(-dist / (sampleRate * 0.5));
            const thunder = (Math.random() * 2 - 1) * envelope * 0.6; // Trovões mais audíveis
            sample += thunder;
          }
        }
        
        data[i] = sample;
      }
    }

    return buffer;
  }

  // Gera buffer de ondas do mar
  private createOceanWavesBuffer(duration: number = 12): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, bufferSize, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      
      let lastOut = 0;
      const waveFreq = 0.08; // Frequência das ondas
      
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        
        // Ruído marrom como base
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        
        // Modulação senoidal lenta para simular ondas
        const waveModulation = Math.sin(2 * Math.PI * waveFreq * t) * 0.5 + 0.5;
        const secondWave = Math.sin(2 * Math.PI * waveFreq * 1.3 * t + 1) * 0.3 + 0.5;
        
        data[i] = lastOut * 2.5 * (waveModulation * 0.6 + secondWave * 0.4) * 0.35; // Volume aumentado de 0.15 para 0.35
      }
    }

    return buffer;
  }

  // Gera buffer de vento
  private createWindBuffer(duration: number = 10): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, bufferSize, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      
      let lastOut = 0;
      
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        
        // Ruído marrom filtrado
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.015 * white) / 1.015;
        
        // Modulação para rajadas de vento
        const gustFreq1 = 0.15;
        const gustFreq2 = 0.07;
        const gust = (Math.sin(2 * Math.PI * gustFreq1 * t) * 0.3 + 
                      Math.sin(2 * Math.PI * gustFreq2 * t + 0.5) * 0.4 + 0.6);
        
        data[i] = lastOut * 3 * gust * 0.30; // Volume aumentado de 0.12 para 0.30
      }
    }

    return buffer;
  }

  // Gera buffer de lareira (crackles)
  private createFireplaceBuffer(duration: number = 10): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, bufferSize, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      
      let lastOut = 0;
      
      for (let i = 0; i < data.length; i++) {
        // Base: ruído marrom suave (calor)
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.01 * white) / 1.01;
        
        let sample = lastOut * 2;
        
        // Crackles aleatórios (estalos)
        if (Math.random() < 0.003) {
          const crackleLength = Math.floor(sampleRate * 0.02);
          for (let j = 0; j < crackleLength && i + j < data.length; j++) {
            const envelope = 1 - j / crackleLength;
            data[i + j] = (data[i + j] || 0) + (Math.random() * 2 - 1) * envelope * 0.2;
          }
        }
        
        data[i] = sample * 0.30; // Volume aumentado de 0.1 para 0.30
      }
    }

    return buffer;
  }

  // Gera buffer de floresta
  private createForestBuffer(duration: number = 12): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, bufferSize, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      
      // Ruído de fundo suave (folhas)
      let b0 = 0, b1 = 0, b2 = 0;
      
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const white = Math.random() * 2 - 1;
        
        // Ruído rosa suave para folhas
        b0 = 0.99 * b0 + white * 0.1;
        b1 = 0.96 * b1 + white * 0.2;
        b2 = 0.90 * b2 + white * 0.3;
        
        let sample = (b0 + b1 + b2) * 0.15; // Volume aumentado de 0.03 para 0.15
        
        // Adicionar pássaros ocasionais (chirps)
        if (Math.random() < 0.0005) {
          const chirpLength = Math.floor(sampleRate * 0.15);
          const baseFreq = 2000 + Math.random() * 2000;
          for (let j = 0; j < chirpLength && i + j < data.length; j++) {
            const envelope = Math.sin(Math.PI * j / chirpLength);
            const freq = baseFreq * (1 + 0.3 * Math.sin(j / (sampleRate * 0.02)));
            data[i + j] = (data[i + j] || 0) + Math.sin(2 * Math.PI * freq * j / sampleRate) * envelope * 0.15; // Volume aumentado
          }
        }
        
        data[i] = sample;
      }
    }

    return buffer;
  }

  // Gera buffer de pássaros
  private createBirdsBuffer(duration: number = 12): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, bufferSize, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      
      // Ambiente suave
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.03; // Volume aumentado
      }
      
      // Adicionar vários cantos de pássaros
      const numBirds = 8;
      for (let b = 0; b < numBirds; b++) {
        const startPos = Math.floor(Math.random() * (bufferSize - sampleRate));
        const baseFreq = 1500 + Math.random() * 3000;
        const chirpDuration = 0.1 + Math.random() * 0.2;
        const chirpLength = Math.floor(sampleRate * chirpDuration);
        
        for (let j = 0; j < chirpLength && startPos + j < data.length; j++) {
          const envelope = Math.sin(Math.PI * j / chirpLength);
          const freqMod = 1 + 0.5 * Math.sin(j / (sampleRate * 0.015));
          data[startPos + j] += Math.sin(2 * Math.PI * baseFreq * freqMod * j / sampleRate) * envelope * 0.12; // Volume aumentado
        }
      }
    }

    return buffer;
  }

  // Gera buffer de grilos da noite
  private createCricketsBuffer(duration: number = 10): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, bufferSize, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      
      // Frequências de grilos (4-7 kHz)
      const cricketFreqs = [4500, 5200, 4800, 5500, 4200];
      const pulseRate = 15; // Pulsos por segundo
      
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        let sample = 0;
        
        for (let c = 0; c < cricketFreqs.length; c++) {
          const freq = cricketFreqs[c] + Math.sin(t * 0.5 + c) * 100;
          const pulse = Math.sin(2 * Math.PI * pulseRate * t + c * Math.PI / 3);
          const envelope = pulse > 0.3 ? 1 : 0.1;
          sample += Math.sin(2 * Math.PI * freq * t) * envelope * 0.08; // Volume aumentado de 0.015 para 0.08
        }
        
        // Ruído de fundo da noite
        sample += (Math.random() * 2 - 1) * 0.02; // Volume aumentado
        
        data[i] = sample;
      }
    }

    return buffer;
  }

  // Gera buffer de rio
  private createRiverBuffer(duration: number = 10): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, bufferSize, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const white = Math.random() * 2 - 1;
        
        // Ruído rosa para água corrente
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        let sample = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.25; // Volume aumentado de 0.06 para 0.25
        b6 = white * 0.115926;
        
        // Modulação suave para movimento da água
        const flow = Math.sin(2 * Math.PI * 0.3 * t) * 0.2 + 0.9;
        const ripple = Math.sin(2 * Math.PI * 1.5 * t) * 0.1 + 1;
        
        data[i] = sample * flow * ripple;
      }
    }

    return buffer;
  }

  async play(type: GeneratedSoundType, volume: number = 0.5): Promise<void> {
    this.stop();
    await this.initAudioContext();

    if (!this.audioContext) return;

    let buffer: AudioBuffer;
    
    // Determinar qual buffer criar
    switch (type) {
      case 'white':
      case 'brown':
      case 'pink':
        buffer = this.createNoiseBuffer(type);
        break;
      case 'rain':
        buffer = this.createRainBuffer();
        break;
      case 'thunder-rain':
        buffer = this.createThunderRainBuffer();
        break;
      case 'ocean-waves':
        buffer = this.createOceanWavesBuffer();
        break;
      case 'wind':
        buffer = this.createWindBuffer();
        break;
      case 'fireplace':
        buffer = this.createFireplaceBuffer();
        break;
      case 'forest':
        buffer = this.createForestBuffer();
        break;
      case 'birds':
        buffer = this.createBirdsBuffer();
        break;
      case 'night-crickets':
        buffer = this.createCricketsBuffer();
        break;
      case 'river':
        buffer = this.createRiverBuffer();
        break;
      default:
        buffer = this.createNoiseBuffer('white');
    }
    
    this.noiseNode = this.audioContext.createBufferSource();
    this.noiseNode.buffer = buffer;
    this.noiseNode.loop = true;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = volume;

    this.noiseNode.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.noiseNode.start();
    this.isPlaying = true;
  }

  // Reproduz um arquivo de áudio (MP3) em loop
  async playFromUrl(url: string, volume: number = 0.5): Promise<void> {
    this.stop();
    
    this.audioElement = new Audio(url);
    this.audioElement.loop = true;
    this.audioElement.volume = Math.max(0, Math.min(1, volume));
    
    await this.audioElement.play();
    this.isPlaying = true;
  }

  stop(): void {
    // Parar audioElement (para arquivos MP3)
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement = null;
    }

    if (this.noiseNode) {
      try {
        this.noiseNode.stop();
        this.noiseNode.disconnect();
      } catch (e) {
        // Ignorar erro se já parou
      }
      this.noiseNode = null;
    }
    
    // Parar osciladores adicionais
    for (const osc of this.oscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    }
    this.oscillators = [];
    
    for (const gain of this.additionalGains) {
      try {
        gain.disconnect();
      } catch (e) {}
    }
    this.additionalGains = [];
    
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    this.isPlaying = false;
  }

  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    // Para arquivos MP3
    if (this.audioElement) {
      this.audioElement.volume = clampedVolume;
    }
    // Para sons gerados
    if (this.gainNode) {
      this.gainNode.gain.value = clampedVolume;
    }
  }

  fadeIn(duration: number = 1): void {
    if (this.gainNode && this.audioContext) {
      const currentTime = this.audioContext.currentTime;
      this.gainNode.gain.setValueAtTime(0, currentTime);
      this.gainNode.gain.linearRampToValueAtTime(
        this.gainNode.gain.value || 0.5,
        currentTime + duration
      );
    }
  }

  fadeOut(duration: number = 1): Promise<void> {
    return new Promise((resolve) => {
      if (this.gainNode && this.audioContext) {
        const currentTime = this.audioContext.currentTime;
        const currentVolume = this.gainNode.gain.value;
        this.gainNode.gain.setValueAtTime(currentVolume, currentTime);
        this.gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);
        setTimeout(() => {
          this.stop();
          resolve();
        }, duration * 1000);
      } else {
        resolve();
      }
    });
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton para uso global
let noiseGeneratorInstance: NoiseGenerator | null = null;

export const getNoiseGenerator = (): NoiseGenerator => {
  if (!noiseGeneratorInstance) {
    noiseGeneratorInstance = new NoiseGenerator();
  }
  return noiseGeneratorInstance;
};
