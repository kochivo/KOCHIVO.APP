import { afterEach, expect, it, vi } from 'vitest';
import { triggerHaptic } from './haptics';

afterEach(() => vi.unstubAllGlobals());

it.each([
  ['light', [50]], ['success', [50, 50, 50]], ['heavy', [100, 50, 100]], ['alarm', [200, 100, 200]],
] as const)('vibrates the %s pattern', (type, pattern) => {
  const vibrate = vi.fn();
  vi.stubGlobal('navigator', { vibrate });
  triggerHaptic(type);
  expect(vibrate).toHaveBeenCalledExactlyOnceWith(pattern);
});

it('does nothing without the Vibration API or when it throws', () => {
  vi.stubGlobal('navigator', {});
  expect(() => triggerHaptic('light')).not.toThrow();
  vi.stubGlobal('navigator', { vibrate: () => { throw new Error('blocked'); } });
  expect(() => triggerHaptic('heavy')).not.toThrow();
});
