export type Haptic = 'light' | 'success' | 'heavy' | 'alarm';

const patterns: Record<Haptic, number[]> = {
  light: [50],
  success: [50, 50, 50],
  heavy: [100, 50, 100],
  // Rest end has to be felt through a pocket, so it stays longer than the tap patterns.
  alarm: [200, 100, 200],
};

/** Vibrates where the Vibration API exists (Android); iOS Safari and SSR are a silent no-op. */
export function triggerHaptic(type: Haptic): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try { navigator.vibrate(patterns[type]); } catch { /* Optional device capability. */ }
}
