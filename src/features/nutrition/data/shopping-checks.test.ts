import { afterEach, expect, it, vi } from 'vitest';
import { readShoppingChecks, writeShoppingChecks } from './shopping-checks';

afterEach(() => vi.unstubAllGlobals());

it('restores and resets checks for the same list only', () => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key),
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  writeShoppingChecks('player-plan-week', new Set(['rice']));
  writeShoppingChecks('other-list', new Set(['eggs']));
  expect(readShoppingChecks('player-plan-week')).toEqual(new Set(['rice']));
  expect(readShoppingChecks('other-list')).toEqual(new Set(['eggs']));
  writeShoppingChecks('player-plan-week', new Set());
  expect(readShoppingChecks('player-plan-week').size).toBe(0);
  expect(readShoppingChecks('other-list')).toEqual(new Set(['eggs']));
});

it('allows shopping when local storage is unavailable', () => {
  vi.stubGlobal('localStorage', undefined);
  expect(readShoppingChecks('list').size).toBe(0);
  expect(() => writeShoppingChecks('list', new Set(['rice']))).not.toThrow();
});
