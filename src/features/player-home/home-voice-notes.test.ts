import { createElement } from 'react';
import type * as ReactModule from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { VoiceNote } from '@/features/voice-notes';
import { useHomeVoiceNotes } from './components/use-home-voice-notes';

const state = vi.hoisted(() => ({ values: [] as unknown[], index: 0,
  effects: [] as (() => void | (() => void))[], load: vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof ReactModule>(),
  useEffect: (effect: () => void | (() => void)) => { state.effects.push(effect); },
  useState: (initial: unknown) => {
    const index = state.index++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index], (next: unknown) => {
      state.values[index] = typeof next === 'function' ? next(state.values[index]) : next;
    }];
  },
}));
vi.mock('@/features/voice-notes', () => ({ listVoiceNotes: state.load }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({}) }));

function Probe({ playerId }: { playerId?: string }) {
  const result = useHomeVoiceNotes(playerId);
  return createElement('output', {}, `${result.status}:${result.notes.map(note => note.id).join(',')}`);
}
const render = (playerId = 'player') => {
  state.index = 0;
  return renderToStaticMarkup(createElement(Probe, { playerId }));
};
function deferred() {
  let resolve: (notes: VoiceNote[]) => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<VoiceNote[]>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
// The hook imports voice-notes on demand, which adds microtask hops before the loader runs.
const flush = async () => { for (let hop = 0; hop < 10; hop++) await Promise.resolve(); };
const note: VoiceNote = { id: 'new', url: '/audio', durationSeconds: 24, listenedAt: '2026-11-11T08:00:00Z',
  createdAt: '2026-11-11T07:00:00Z', contextId: null };
beforeEach(() => { state.values = []; state.effects = []; state.load.mockReset(); vi.stubGlobal('window', new EventTarget()); });
afterEach(() => vi.unstubAllGlobals());

it.each(['response', 'error'])('ignores an older voice %s after a newer refresh succeeds', async kind => {
  const older = deferred();
  const newer = deferred();
  state.load.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
  expect(render()).toContain('loading:');
  const cleanup = state.effects[0]?.();
  await flush();
  window.dispatchEvent(new Event('focus'));
  await flush();
  newer.resolve([note]);
  await flush();
  expect(render()).toContain('ready:new');
  if (kind === 'response') older.resolve([{ ...note, id: 'old', listenedAt: null }]);
  else older.reject(new Error('offline'));
  await flush();
  expect(render()).toContain('ready:new');
  cleanup?.();
});
it('hides notes when identity changes and ignores an unmounted response', async () => {
  const pending = deferred();
  state.load.mockReturnValueOnce(pending.promise);
  render();
  const cleanup = state.effects[0]?.();
  await flush();
  cleanup?.();
  pending.resolve([note]);
  await flush();
  expect(render()).toContain('loading:');
  expect(render('another-player')).not.toContain('new');
});
