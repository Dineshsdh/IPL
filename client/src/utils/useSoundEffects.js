import { useRef, useCallback, useState } from 'react';

// Web Audio API-based sound effects — no external files needed
export default function useSoundEffects() {
  const ctxRef = useRef(null);
  const [muted, setMuted] = useState(false);

  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctxRef.current;
  };

  const playTone = useCallback((frequency, duration, type = 'sine', volume = 0.3) => {
    if (muted) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio not available
    }
  }, [muted]);

  const playBid = useCallback(() => {
    playTone(880, 0.15, 'sine', 0.25);
    setTimeout(() => playTone(1100, 0.1, 'sine', 0.2), 80);
  }, [playTone]);

  const playSold = useCallback(() => {
    playTone(523, 0.2, 'sine', 0.3);
    setTimeout(() => playTone(659, 0.2, 'sine', 0.3), 150);
    setTimeout(() => playTone(784, 0.3, 'sine', 0.3), 300);
    setTimeout(() => playTone(1047, 0.5, 'sine', 0.25), 450);
  }, [playTone]);

  const playUnsold = useCallback(() => {
    playTone(400, 0.3, 'triangle', 0.2);
    setTimeout(() => playTone(300, 0.4, 'triangle', 0.15), 200);
    setTimeout(() => playTone(200, 0.5, 'triangle', 0.1), 400);
  }, [playTone]);

  const playWarning = useCallback(() => {
    playTone(600, 0.1, 'square', 0.15);
  }, [playTone]);

  const playCountdown = useCallback((secondsLeft) => {
    if (secondsLeft <= 5 && secondsLeft > 0) {
      const freq = 800 + (5 - secondsLeft) * 100;
      playTone(freq, 0.08, 'square', 0.12 + (5 - secondsLeft) * 0.03);
    }
  }, [playTone]);

  const toggleMute = useCallback(() => {
    setMuted(prev => !prev);
  }, []);

  return {
    playBid,
    playSold,
    playUnsold,
    playWarning,
    playCountdown,
    muted,
    toggleMute
  };
}
