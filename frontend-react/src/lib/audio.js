let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

export const isMuted = () => localStorage.getItem('dit_sound_muted') === 'true';

export const toggleMute = () => {
  const current = isMuted();
  localStorage.setItem('dit_sound_muted', String(!current));
  return !current;
};

function playTone(freq, duration, type = 'sine', volume = 0.1, delay = 0) {
  if (isMuted()) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch (e) {}
}

export const sounds = {
  success: () => {
    playTone(880, 0.15, 'sine', 0.08, 0);
    playTone(1320, 0.2, 'sine', 0.08, 0.1);
  },
  error: () => {
    playTone(220, 0.15, 'sawtooth', 0.06, 0);
    playTone(165, 0.2, 'sawtooth', 0.06, 0.1);
  },
  info: () => {
    playTone(660, 0.08, 'sine', 0.05, 0);
  },
  warning: () => {
    playTone(523, 0.12, 'triangle', 0.07, 0);
    playTone(659, 0.15, 'triangle', 0.07, 0.08);
  },
  kaching: () => {
    playTone(1046, 0.1, 'sine', 0.1, 0);
    playTone(1318, 0.1, 'sine', 0.1, 0.08);
    playTone(1568, 0.2, 'sine', 0.1, 0.16);
  },
  click: () => {
    playTone(800, 0.03, 'square', 0.02, 0);
  },
};
