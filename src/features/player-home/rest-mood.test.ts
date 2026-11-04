import { createElement } from 'react';
import type * as ReactModule from 'react';
import type * as Offline from '@/core/offline';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useRestMood } from './hooks/use-rest-mood';

const state = vi.hoisted(() => ({ effects: [] as (() => void | (() => void))[], index: 0, refresh: vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof ReactModule>(),
  useEffect: (effect: () => void | (() => void)) => { state.effects.push(effect); },
}));
vi.mock('@/lib/use-calendar-clock', () => ({ useCalendarClock: () => ({ now: new Date('2026-11-04T10:00:00Z') }) }));
vi.mock('@/core/offline/use-today-decision', () => ({ useTodayDecision: () => null }));
vi.mock('./data/refresh-snapshot', () => ({ refreshSnapshot: state.refresh }));
vi.mock('@/core/offline', async original => ({ ...await original<typeof Offline>(), localDb() {}, useLiveQuery: () => [
  { player_id: 'player', training_days: [1, 2], days: [] }, [],
][state.index++] }));

function render(enabled = true) {
  function Probe() { return createElement('div', { 'data-mood': useRestMood(enabled) ? 'rest' : undefined }); }
  return renderToStaticMarkup(createElement(Probe));
}
beforeEach(() => { state.effects = []; state.index = 0; state.refresh.mockClear(); });
afterEach(() => vi.unstubAllGlobals());

it('refreshes the program on direct shell entry and restores theme color on cleanup', () => {
  const window = new EventTarget();
  const meta = { content: 'training-bg' };
  let frame: FrameRequestCallback | undefined;
  let mounted = false;
  const cancel = vi.fn();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 7; });
  vi.stubGlobal('cancelAnimationFrame', cancel);
  vi.stubGlobal('window', window);
  vi.stubGlobal('document', { querySelector: (selector: string) => selector.startsWith('meta') ? meta : mounted ? {} : null });
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => 'rest-bg' }));
  expect(render()).toContain('data-mood="rest"');
  const stopRefresh = state.effects[0]?.();
  expect(state.refresh).toHaveBeenCalledTimes(1);
  window.dispatchEvent(new Event('online'));
  expect(state.refresh).toHaveBeenCalledTimes(2);
  const restoreTheme = state.effects[1]?.();
  expect(meta.content).toBe('training-bg');
  mounted = true;
  expect(frame).toBeTypeOf('function');
  frame?.(0);
  expect(meta.content).toBe('rest-bg');
  restoreTheme?.();
  expect(cancel).toHaveBeenCalledWith(7);
  expect(meta.content).toBe('training-bg');
  stopRefresh?.();
  window.dispatchEvent(new Event('online'));
  expect(state.refresh).toHaveBeenCalledTimes(2);
});

it('cancels a pending theme update when the lazy mood sync unmounts', () => {
  const cancel = vi.fn();
  const meta = { content: 'training-bg' };
  vi.stubGlobal('document', { querySelector: () => meta });
  vi.stubGlobal('requestAnimationFrame', () => 8);
  vi.stubGlobal('cancelAnimationFrame', cancel);
  render();
  const cleanup = state.effects[1]?.();
  cleanup?.();
  expect(cancel).toHaveBeenCalledWith(8);
  expect(meta.content).toBe('training-bg');
});

it('leaves the focus screen without rest mood or a shell refresh', () => {
  expect(render(false)).not.toContain('data-mood');
  state.effects.forEach(effect => effect());
  expect(state.refresh).not.toHaveBeenCalled();
});
