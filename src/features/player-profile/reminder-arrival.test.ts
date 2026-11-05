import type * as ReactModule from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { ReminderArrival } from './components/reminder-arrival';

const lifecycle = vi.hoisted(() => ({ effect: undefined as (() => (() => void)) | undefined }));
vi.mock('react', async original => ({
  ...await original<typeof ReactModule>(),
  useEffect: (effect: () => (() => void)) => { lifecycle.effect = effect; },
}));
afterEach(() => vi.unstubAllGlobals());

it.each(['#voice-recorder-p', ''])('focuses the recorder only on a reminder arrival (%s)', hash => {
  const focus = vi.fn();
  const scrollIntoView = vi.fn();
  const addEventListener = vi.fn();
  const removeEventListener = vi.fn();
  vi.stubGlobal('document', { getElementById: () => ({ scrollIntoView, querySelector: () => ({ focus }) }) });
  vi.stubGlobal('window', { location: { hash }, matchMedia: () => ({ matches: false }), addEventListener, removeEventListener });
  ReminderArrival({ playerId: 'p', children: null });
  const cleanup = lifecycle.effect?.();
  expect(focus).toHaveBeenCalledTimes(hash ? 1 : 0);
  expect(scrollIntoView).toHaveBeenCalledTimes(hash ? 1 : 0);
  expect(addEventListener).toHaveBeenCalledWith('hashchange', expect.any(Function));
  cleanup?.();
  expect(removeEventListener).toHaveBeenCalledWith('hashchange', addEventListener.mock.calls[0]?.[1]);
});
