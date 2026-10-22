export function useSound() {
  function getCtx() {
    return new (window.AudioContext || window.webkitAudioContext)();
  }

  function playTone(ctx, freq, start, duration, type = 'sine', volume = 0.3) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + duration);
  }

  const playSuccess = () => {
    try {
      const ctx = getCtx();
      [523, 659, 784, 1047].forEach((f, i) => playTone(ctx, f, i * 0.15, 0.4));
    } catch {}
  };

  const playWrong = () => {
    try {
      const ctx = getCtx();
      playTone(ctx, 300, 0, 0.4, 'sawtooth', 0.25);
      playTone(ctx, 220, 0.2, 0.3, 'sawtooth', 0.2);
    } catch {}
  };

  const playCelebration = () => {
    try {
      const ctx = getCtx();
      [523, 659, 784, 1047, 1319, 1047, 1319, 1568].forEach((f, i) =>
        playTone(ctx, f, i * 0.1, 0.35, 'sine', 0.35)
      );
    } catch {}
  };

  const playClick = () => {
    try {
      const ctx = getCtx();
      playTone(ctx, 900, 0, 0.08, 'sine', 0.1);
    } catch {}
  };

  const playHint = () => {
    try {
      const ctx = getCtx();
      [440, 554, 659].forEach((f, i) => playTone(ctx, f, i * 0.12, 0.25));
    } catch {}
  };

  const playEncourage = () => {
    try {
      const ctx = getCtx();
      [392, 330, 262].forEach((f, i) => playTone(ctx, f, i * 0.15, 0.3, 'sine', 0.2));
    } catch {}
  };

  return { playSuccess, playWrong, playCelebration, playClick, playHint, playEncourage };
}
