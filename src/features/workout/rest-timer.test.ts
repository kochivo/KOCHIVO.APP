import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const hooks = vi.hoisted(() => ({ states: [] as unknown[], effects: [] as (() => void | (() => void))[] }));
vi.mock('react', () => ({
  useState: (initial: unknown) => {
    const index = hooks.states.length;
    hooks.states.push(initial);
    return [initial, (value: unknown) => { hooks.states[index] = value; }];
  },
  useRef: (current: unknown) => ({ current }),
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => void | (() => void)) => { hooks.effects.push(effect); },
}));
import { useRestTimer as renderRestTimer } from './hooks/use-rest-timer';

const storage = new Map<string, string>();
const preferences = new Map<string, string>();
const adapter = (map: Map<string, string>) => ({ getItem: (key: string) => map.get(key) ?? null,
  setItem: (key: string, value: string) => map.set(key, value), removeItem: (key: string) => map.delete(key) });
let document: EventTarget;
let cleanup: (() => void) | void;
let now: number;
const chime = vi.fn();
const prepare = vi.fn();
beforeEach(() => {
  hooks.states = []; hooks.effects = []; storage.clear(); preferences.clear();
  vi.clearAllMocks(); vi.useFakeTimers(); now = 100_000;
  document = new EventTarget();
  vi.stubGlobal('document', document); vi.stubGlobal('window', globalThis);
  vi.stubGlobal('navigator', { vibrate: vi.fn() });
  vi.stubGlobal('sessionStorage', adapter(storage)); vi.stubGlobal('localStorage', adapter(preferences));
});
afterEach(() => { cleanup?.(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const mount = () => {
  const timer = renderRestTimer({ now: () => now, chime, prepare });
  cleanup = hooks.effects.at(-1)?.();
  return timer;
};
const tick = () => document.dispatchEvent(new Event('visibilitychange'));

it('includes extensions in total, restores them, and chimes once at zero alongside vibration', () => {
  const timer = mount();
  timer.start(60);
  now += 10_000; tick(); timer.extend();
  expect(hooks.states[1]).toBe(80);
  expect(hooks.states[2]).toBe(90);
  expect(storage.get('kochivo:rest-total')).toBe('90');
  cleanup?.(); hooks.states = [];
  mount();
  expect(hooks.states[2]).toBe(90);
  now += 81_000; tick(); tick();
  expect(chime).toHaveBeenCalledTimes(1);
  expect(navigator.vibrate).toHaveBeenCalledTimes(1);
  expect(storage.size).toBe(0);
});

it('never chimes on reopening an expired rest', () => {
  storage.set('kochivo:rest-ends-at', String(now - 1000));
  storage.set('kochivo:rest-total', '60');
  mount(); tick();
  expect(chime).not.toHaveBeenCalled();
  expect(navigator.vibrate).not.toHaveBeenCalled();
  expect(storage.size).toBe(0);
});

it('defaults sound on, persists the toggle and still vibrates when muted', () => {
  const timer = mount();
  expect(timer.sound).toBe(true);
  timer.toggleSound();
  expect(preferences.get('kochivo:rest-sound')).toBe('off');
  timer.start(1); now += 1000; tick();
  expect(chime).not.toHaveBeenCalled();
  expect(navigator.vibrate).toHaveBeenCalledTimes(1);
  cleanup?.(); hooks.states = []; mount();
  expect(hooks.states[3]).toBe(false);
});

it('skip never chimes and audio failures do not break completion', () => {
  const timer = mount();
  timer.start(1); timer.skip(); now += 1000; tick();
  expect(chime).not.toHaveBeenCalled();
  chime.mockImplementationOnce(() => { throw new Error('blocked'); });
  timer.start(1); now += 1000;
  expect(tick).not.toThrow(); tick();
  expect(chime).toHaveBeenCalledTimes(1);
});
