import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

// Moved here from the workout screen test: importing the whole screen timed out under a loaded run.
it('refreshes Cairo today on visible resume and focus, then removes its listeners', () => {
  vi.useFakeTimers({ now: new Date('2026-11-03T21:59:00Z') });
  const windowEvents = new EventTarget();
  const documentEvents = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  vi.stubGlobal('window', windowEvents); vi.stubGlobal('document', documentEvents);
  vi.stubGlobal('navigator', { onLine: true });
  const RenderClock = () => { state.index = 0; return useCalendarClock(); };
  const today = () => localDate(RenderClock().now ?? new Date(0));
  RenderClock();
  const cleanup = state.effect?.();
  expect(today()).toBe('2026-11-03');
  // Jump the wall clock without firing the minute timer, as when a phone sleeps.
  vi.setSystemTime(new Date('2026-11-03T22:01:00Z'));
  documentEvents.visibilityState = 'hidden';
  documentEvents.dispatchEvent(new Event('visibilitychange'));
  expect(today()).toBe('2026-11-03');
  documentEvents.visibilityState = 'visible';
  documentEvents.dispatchEvent(new Event('visibilitychange'));
  expect(today()).toBe('2026-11-04');
  vi.setSystemTime(new Date('2026-11-04T22:01:00Z'));
  windowEvents.dispatchEvent(new Event('focus'));
  expect(today()).toBe('2026-11-05');
  cleanup?.();
  vi.setSystemTime(new Date('2026-11-05T22:01:00Z'));
  windowEvents.dispatchEvent(new Event('focus'));
  documentEvents.dispatchEvent(new Event('visibilitychange'));
  expect(today()).toBe('2026-11-05');
});

it('keys the workout screen to the clock day so a new Cairo day starts fresh', () => {
  const source = readFileSync(join(process.cwd(), 'src/features/workout/components/focus-screen.tsx'), 'utf8');
  expect(source).toContain('useCalendarClock()');
  expect(source).toContain('key={`${dayId}:${today}`}');
});
