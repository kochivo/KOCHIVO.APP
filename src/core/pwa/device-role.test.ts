import { afterEach, expect, it, vi } from 'vitest';
import { clearDeviceRole, readDeviceRole, rememberDeviceRole } from './device-role';

afterEach(() => vi.unstubAllGlobals());

it.each(['captain', 'player'] as const)('remembers and clears %s', role => {
  const storage = new Map<string, string>();
  vi.stubGlobal('window', { localStorage: {
    getItem: (key: string) => storage.get(key),
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  } });
  rememberDeviceRole(role);
  expect(storage.get('kochivo.role')).toBe(role);
  expect(readDeviceRole()).toBe(role);
  clearDeviceRole();
  expect(readDeviceRole()).toBeNull();
});

it('ignores unavailable storage and unknown roles', () => {
  vi.stubGlobal('window', { get localStorage() { throw new Error('blocked'); } });
  expect(readDeviceRole()).toBeNull();
  expect(() => rememberDeviceRole('captain')).not.toThrow();
  expect(() => clearDeviceRole()).not.toThrow();
  vi.stubGlobal('window', { localStorage: { getItem: () => 'admin' } });
  expect(readDeviceRole()).toBeNull();
});

