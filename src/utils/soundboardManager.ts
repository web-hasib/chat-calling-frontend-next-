'use client';

export interface SoundboardItem {
  id: string;
  name: string;
  emoji: string;
  category: 'frequently_used' | 'discord' | 'custom';
  audioData?: string; // Base64 data URL for custom sounds
  isCustom?: boolean;
}

export const DEFAULT_SOUNDS: SoundboardItem[] = [
  { id: 'airhorn', name: 'airhorn', emoji: '📢', category: 'discord' },
  { id: 'quack', name: 'quack', emoji: '🦆', category: 'discord' },
  { id: 'cricket', name: 'cricket', emoji: '🦗', category: 'discord' },
  { id: 'golf_clap', name: 'golf clap', emoji: '👏', category: 'discord' },
  { id: 'sad_horn', name: 'sad horn', emoji: '🎺', category: 'discord' },
  { id: 'ba_dum_tss', name: 'ba dum tss', emoji: '🥁', category: 'discord' },
  { id: 'boom', name: 'boom', emoji: '💥', category: 'discord' },
  { id: 'ding', name: 'ding', emoji: '🛎️', category: 'discord' },
  { id: 'yay', name: 'yay', emoji: '🎉', category: 'discord' },
  { id: 'victory', name: 'victory', emoji: '🎮', category: 'discord' },
];

class SoundboardManager {
  private audioCtx: AudioContext | null = null;
  private volume: number = 0.8;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedVol = localStorage.getItem('chat_calling_soundboard_vol');
        if (savedVol !== null) {
          this.volume = parseFloat(savedVol);
        }
      } catch {}
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('chat_calling_soundboard_vol', this.volume.toString());
    } catch {}
  }

  public getVolume(): number {
    return this.volume;
  }

  public getCustomSounds(): SoundboardItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('chat_calling_custom_sounds');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return [];
  }

  public saveCustomSound(sound: SoundboardItem): SoundboardItem[] {
    const list = this.getCustomSounds().filter(s => s.id !== sound.id);
    list.unshift(sound);
    try {
      localStorage.setItem('chat_calling_custom_sounds', JSON.stringify(list));
    } catch {}
    return list;
  }

  public deleteCustomSound(id: string): SoundboardItem[] {
    const list = this.getCustomSounds().filter(s => s.id !== id);
    try {
      localStorage.setItem('chat_calling_custom_sounds', JSON.stringify(list));
    } catch {}
    return list;
  }

  public getFrequentlyUsed(): SoundboardItem[] {
    if (typeof window === 'undefined') return DEFAULT_SOUNDS.slice(0, 3);
    try {
      const saved = localStorage.getItem('chat_calling_freq_sounds');
      if (saved) {
        const ids: string[] = JSON.parse(saved);
        const all = [...this.getCustomSounds(), ...DEFAULT_SOUNDS];
        const res = ids.map(id => all.find(s => s.id === id)).filter(Boolean) as SoundboardItem[];
        if (res.length > 0) return res.slice(0, 6);
      }
    } catch {}
    return DEFAULT_SOUNDS.slice(0, 3);
  }

  public recordSoundUsage(id: string) {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('chat_calling_freq_sounds');
      let ids: string[] = saved ? JSON.parse(saved) : [];
      ids = [id, ...ids.filter(i => i !== id)].slice(0, 8);
      localStorage.setItem('chat_calling_freq_sounds', JSON.stringify(ids));
    } catch {}
  }

  public playSound(soundId: string, customAudioData?: string) {
    if (this.volume <= 0) return;

    if (customAudioData) {
      this.playCustomAudio(customAudioData);
      return;
    }

    // Check if it's a saved custom sound
    const custom = this.getCustomSounds().find(s => s.id === soundId);
    if (custom?.audioData) {
      this.playCustomAudio(custom.audioData);
      return;
    }

    // Synthesize default sound effects
    try {
      const ctx = this.getAudioContext();
      switch (soundId) {
        case 'airhorn':
          this.synthAirhorn(ctx);
          break;
        case 'quack':
          this.synthQuack(ctx);
          break;
        case 'cricket':
          this.synthCricket(ctx);
          break;
        case 'golf_clap':
          this.synthGolfClap(ctx);
          break;
        case 'sad_horn':
          this.synthSadHorn(ctx);
          break;
        case 'ba_dum_tss':
          this.synthBaDumTss(ctx);
          break;
        case 'boom':
          this.synthBoom(ctx);
          break;
        case 'ding':
          this.synthDing(ctx);
          break;
        case 'yay':
          this.synthYay(ctx);
          break;
        case 'victory':
          this.synthVictory(ctx);
          break;
        default:
          this.synthDing(ctx);
      }
    } catch (e) {
      console.warn('[Soundboard] Failed to play sound effect:', e);
    }
  }

  private playCustomAudio(audioData: string) {
    try {
      const audio = new Audio(audioData);
      audio.volume = this.volume;
      audio.play().catch(e => console.warn('[Soundboard] Audio playback error:', e));
    } catch (e) {
      console.warn('[Soundboard] Custom sound playback error:', e);
    }
  }

  // --- Synthesizers using Web Audio API ---

  private synthAirhorn(ctx: AudioContext) {
    const playBurst = (startTime: number, duration: number) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(466.16, startTime); // Bb4
      osc2.frequency.setValueAtTime(470.00, startTime);

      gain.gain.setValueAtTime(this.volume * 0.4, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration);
      osc2.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playBurst(now, 0.18);
    playBurst(now + 0.22, 0.18);
    playBurst(now + 0.44, 0.45);
  }

  private synthQuack(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.Q.setValueAtTime(5, now);

    gain.gain.setValueAtTime(this.volume * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  private synthCricket(ctx: AudioContext) {
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.09;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(4500, t);
      osc.frequency.exponentialRampToValueAtTime(4200, t + 0.06);

      gain.gain.setValueAtTime(this.volume * 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.07);
    }
  }

  private synthGolfClap(ctx: AudioContext) {
    const now = ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200;

      const gain = ctx.createGain();
      const t = now + i * 0.14 + (Math.random() * 0.03);
      gain.gain.setValueAtTime(this.volume * 0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(t);
    }
  }

  private synthSadHorn(ctx: AudioContext) {
    const now = ctx.currentTime;
    const notes = [
      { f: 330, d: 0.35 }, // E4
      { f: 311.13, d: 0.35 }, // Eb4
      { f: 293.66, d: 0.35 }, // D4
      { f: 277.18, d: 0.7 }, // C#4
    ];

    let t = now;
    notes.forEach((n, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, t);
      if (idx === notes.length - 1) {
        osc.frequency.linearRampToValueAtTime(n.f - 25, t + n.d);
      }

      gain.gain.setValueAtTime(this.volume * 0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + n.d);
      t += n.d * 0.95;
    });
  }

  private synthBaDumTss(ctx: AudioContext) {
    const now = ctx.currentTime;

    // Ba (Tom 1)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.frequency.setValueAtTime(160, now);
    osc1.frequency.exponentialRampToValueAtTime(80, now + 0.12);
    gain1.gain.setValueAtTime(this.volume * 0.5, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.14);

    // Dum (Tom 2)
    const t2 = now + 0.18;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.frequency.setValueAtTime(140, t2);
    osc2.frequency.exponentialRampToValueAtTime(60, t2 + 0.15);
    gain2.gain.setValueAtTime(this.volume * 0.5, t2);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.15);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t2);
    osc2.stop(t2 + 0.17);

    // Tss (Cymbal)
    const t3 = now + 0.38;
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    const gain3 = ctx.createGain();
    gain3.gain.setValueAtTime(this.volume * 0.4, t3);
    gain3.gain.exponentialRampToValueAtTime(0.001, t3 + 0.38);

    noise.connect(filter);
    filter.connect(gain3);
    gain3.connect(ctx.destination);
    noise.start(t3);
  }

  private synthBoom(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);

    gain.gain.setValueAtTime(this.volume * 0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.75);
  }

  private synthDing(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, now); // A6
    gain.gain.setValueAtTime(this.volume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.65);
  }

  private synthYay(ctx: AudioContext) {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(this.volume * 0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  private synthVictory(ctx: AudioContext) {
    const now = ctx.currentTime;
    const notes = [
      { f: 523.25, d: 0.12 }, // C5
      { f: 587.33, d: 0.12 }, // D5
      { f: 659.25, d: 0.12 }, // E5
      { f: 783.99, d: 0.28 }, // G5
    ];

    let t = now;
    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(n.f, t);
      gain.gain.setValueAtTime(this.volume * 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + n.d);
      t += n.d * 0.9;
    });
  }
}

export const soundboardManager = new SoundboardManager();
