import type { GamePreferences } from '../types';

export function feedback(
  preferences: GamePreferences,
  kind: 'soft' | 'success' | 'alert' = 'soft',
) {
  if (preferences.haptics && navigator.vibrate) {
    navigator.vibrate(kind === 'alert' ? [80, 45, 80] : kind === 'success' ? [35, 25, 55] : 25);
  }
  if (!preferences.sound) return;
  try {
    const AudioContextClass = window.AudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === 'alert' ? 'sawtooth' : 'sine';
    oscillator.frequency.value = kind === 'alert' ? 180 : kind === 'success' ? 620 : 420;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
    oscillator.addEventListener('ended', () => void context.close(), { once: true });
  } catch {
    // Audio is enhancement only; browser policies may block it.
  }
}
