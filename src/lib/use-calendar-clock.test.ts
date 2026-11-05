import { afterEach, expect, it, vi } from 'vitest';
import { localDate } from './dates';
import { useCalendarClock } from './use-calendar-clock';

const state = vi.hoisted(() => ({ values: [] as unknown[], index: 0,
  effect: undefined as undefined | (() => (() => void) | void) }));
vi.mock('react', () => ({
  useState: (initial: unknown) => {
    const index = state.index++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index], (value: unknown) => { state.values[index] = value; }];
  },
  useEffect: (effect: () => (() => void) | void) => { state.effect = effect; },
}));
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); state.values = []; state.index = 0; });
it('refreshes the foreground clock at Cairo midnight and removes timers and event listeners', () => {
  vi.useFakeTimers({ now: new Date('2026-11-06T21:59:59Z') });
  const windowEvents = new EventTarget(); const documentEvents = new EventTarget();
  vi.stubGlobal('window', windowEvents); vi.stubGlobal('document', documentEvents);
  vi.stubGlobal('navigator', { onLine: true });
  const RenderClock = () => { state.index = 0; return useCalendarClock(); };
  RenderClock();
  const cleanup = state.effect?.();
  expect(localDate(RenderClock().now ?? new Date(0))).toBe('2026-11-06');
  vi.advanceTimersByTime(1000);
  expect(localDate(RenderClock().now ?? new Date(0))).toBe('2026-11-07');
  vi.stubGlobal('navigator', { onLine: false });
  windowEvents.dispatchEvent(new Event('offline'));
  expect(RenderClock().online).toBe(false);
  cleanup?.();
  expect(vi.getTimerCount()).toBe(0);
  vi.stubGlobal('navigator', { onLine: true });
  windowEvents.dispatchEvent(new Event('online'));
  expect(RenderClock().online).toBe(false);
});
