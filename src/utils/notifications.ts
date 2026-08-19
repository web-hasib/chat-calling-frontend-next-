// Browser Web Push Notification & Customizable Sound Synthesizer

export type MessageTonePreset = 'chime' | 'pop' | 'bell' | 'marimba' | 'arcade';
export type CallTonePreset = 'classic' | 'digital' | 'cosmic' | 'marimba' | 'soft';

export const MESSAGE_TONES: { id: MessageTonePreset; name: string; desc: string }[] = [
  { id: 'chime', name: 'Messenger Chime (Default)', desc: 'Smooth two-tone sine chime' },
  { id: 'pop', name: 'Soft Bubble Pop', desc: 'Light resonant bubble pop' },
  { id: 'bell', name: 'Crystal Bell', desc: 'Clear high-pitch glass bell' },
  { id: 'marimba', name: 'Warm Marimba', desc: 'Wooden acoustic melody' },
  { id: 'arcade', name: 'Retro Arcade', desc: 'Playful 8-bit jump sound' },
];

export const CALL_TONES: { id: CallTonePreset; name: string; desc: string }[] = [
  { id: 'classic', name: 'Classic Telephone (Default)', desc: 'Standard vibrating phone ringtone' },
  { id: 'digital', name: 'Digital Pulse', desc: 'Modern electronic pulse melody' },
  { id: 'cosmic', name: 'Cosmic Echo', desc: 'Ambient futuristic synth ring' },
  { id: 'marimba', name: 'Marimba Loop', desc: 'Lively tropical marimba tune' },
  { id: 'soft', name: 'Zen Soft Chime', desc: 'Calm and relaxing harmonic melody' },
];

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function showPushNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  const enabled = localStorage.getItem('push_notifications_enabled') !== 'false';
  if (!enabled) return;

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        silent: false,
        ...options,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (e) {
      console.error('Error showing push notification:', e);
    }
  }
}

// ── Synthesized Message Tone Player ──
export function playMessageNotificationSound(customPreset?: MessageTonePreset) {
  if (typeof window === 'undefined') return;
  const enabled = localStorage.getItem('sound_effects_enabled') !== 'false';
  if (!enabled && !customPreset) return;

  const preset: MessageTonePreset =
    customPreset || (localStorage.getItem('message_tone_preset') as MessageTonePreset) || 'chime';

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (preset === 'pop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (preset === 'bell') {
      const freqs = [880, 1760];
      freqs.forEach((f) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      });
    } else if (preset === 'marimba') {
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.05);
        gain.gain.setValueAtTime(0.18, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.15);
      });
    } else if (preset === 'arcade') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(800, now + 0.15);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else {
      // Default Chime (E5 -> G5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.18);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.08);
      gain2.gain.setValueAtTime(0.15, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.32);
    }
  } catch (e) {
    console.error('Error playing message notification sound:', e);
  }
}

// ── Synthesized Call Ringtone Player / Previewer ──
let activeCallRingInterval: any = null;
let activeCallRingCtx: AudioContext | null = null;

export function playCallRingtone(customPreset?: CallTonePreset) {
  if (typeof window === 'undefined') return;
  const enabled = localStorage.getItem('sound_effects_enabled') !== 'false';
  if (!enabled && !customPreset) return;

  const preset: CallTonePreset =
    customPreset || (localStorage.getItem('call_tone_preset') as CallTonePreset) || 'classic';

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (preset === 'digital') {
      const melody = [440, 554.37, 659.25, 880];
      melody.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.1);
        gain.gain.setValueAtTime(0.12, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.2);
      });
    } else if (preset === 'cosmic') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(960, now + 0.4);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (preset === 'marimba') {
      const notes = [440, 523.25, 659.25, 783.99, 659.25];
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.08);
        gain.gain.setValueAtTime(0.16, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.16);
      });
    } else if (preset === 'soft') {
      const chords = [528, 660, 792];
      chords.forEach((f) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
      });
    } else {
      // Classic Double Beep Ring (440Hz + 480Hz)
      [440, 480].forEach((f) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.setValueAtTime(0.1, now + 0.25);
        gain.gain.setValueAtTime(0, now + 0.3);
        gain.gain.setValueAtTime(0.1, now + 0.35);
        gain.gain.setValueAtTime(0.1, now + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.65);
      });
    }
  } catch (e) {
    console.error('Error playing call ringtone:', e);
  }
}

export function startIncomingCallRingtoneLoop() {
  stopIncomingCallRingtoneLoop();
  playCallRingtone();
  activeCallRingInterval = setInterval(() => {
    playCallRingtone();
  }, 2200);
}

export function stopIncomingCallRingtoneLoop() {
  if (activeCallRingInterval) {
    clearInterval(activeCallRingInterval);
    activeCallRingInterval = null;
  }
  if (activeCallRingCtx) {
    try { activeCallRingCtx.close(); } catch {}
    activeCallRingCtx = null;
  }
}
