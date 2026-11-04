import { afterEach, expect, it, vi } from 'vitest';
import { useDeviceRole } from './use-device-role';

const lifecycle = vi.hoisted(() => ({ mount: undefined as (() => void) | undefined }));
vi.mock('react', () => ({ useEffect: (effect: () => void) => { lifecycle.mount = effect; } }));
afterEach(() => { lifecycle.mount = undefined; vi.unstubAllGlobals(); });

it.each(['captain', 'player'] as const)('stores %s only when the shell mounts', role => {
  const setItem = vi.fn();
  vi.stubGlobal('window', { localStorage: { setItem } });
  useDeviceRole(role);
  expect(setItem).not.toHaveBeenCalled();
  lifecycle.mount?.();
  expect(setItem).toHaveBeenCalledWith('kochivo.role', role);
});
