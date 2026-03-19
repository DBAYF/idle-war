/** Web Audio API procedural sound feedback */

let audioEnabled = true;

export function setAudioEnabled(enabled: boolean) {
  audioEnabled = enabled;
}
let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return ctx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  const context = getContext();
  if (!context || !audioEnabled) return;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.connect(gain);
  gain.connect(context.destination);
  osc.frequency.value = freq;
  osc.type = type;
  gain.gain.setValueAtTime(volume, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  osc.start(context.currentTime);
  osc.stop(context.currentTime + duration);
}

export const audioService = {
  setMuted: (muted: boolean) => {
    audioEnabled = !muted;
  },

  playClick: () => {
    if (!audioEnabled) return;
    playTone(880, 0.05, 'sine', 0.12);
    playTone(1320, 0.08, 'sine', 0.06);
  },

  playCooldownTick: () => {
    if (!audioEnabled) return;
    playTone(440, 0.03, 'sine', 0.04);
  },

  playUpgrade: () => {
    if (!audioEnabled) return;
    playTone(523, 0.06, 'sine', 0.1);
    playTone(659, 0.08, 'sine', 0.08);
    playTone(784, 0.1, 'sine', 0.06);
  },

  playDeploy: () => {
    if (!audioEnabled) return;
    playTone(200, 0.05, 'square', 0.08);
    playTone(300, 0.1, 'sine', 0.06);
  },

  playImpact: () => {
    if (!audioEnabled) return;
    playTone(150, 0.1, 'sawtooth', 0.1);
    playTone(80, 0.15, 'sine', 0.08);
  },

  playBank: () => {
    if (!audioEnabled) return;
    playTone(392, 0.08, 'sine', 0.1);
    playTone(523, 0.12, 'sine', 0.08);
  },

  playStolenCoin: () => {
    if (!audioEnabled) return;
    playTone(659, 0.06, 'sine', 0.1);
    playTone(880, 0.08, 'sine', 0.06);
  },

  playVictoryNear: () => {
    if (!audioEnabled) return;
    playTone(523, 0.1, 'sine', 0.08);
    playTone(659, 0.12, 'sine', 0.06);
  },

  playIncoming: () => {
    if (!audioEnabled) return;
    playTone(330, 0.1, 'sine', 0.08);
    playTone(280, 0.15, 'sine', 0.05);
  },

  playWin: () => {
    if (!audioEnabled) return;
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.2, 'sine', 0.12), i * 120);
    });
  },

  playLose: () => {
    if (!audioEnabled) return;
    playTone(200, 0.2, 'sawtooth', 0.1);
    playTone(150, 0.3, 'sine', 0.08);
  },
};
