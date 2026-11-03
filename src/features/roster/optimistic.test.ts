import { beforeEach, expect, it, vi } from 'vitest';
import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as ReactModule from 'react';

const hooks = vi.hoisted(() => ({
  slots: [] as unknown[], cursor: 0, effects: [] as (() => void)[],
  t: (key: string) => key, data: undefined as unknown,
}));
vi.mock('react', async original => ({
  ...await original<typeof ReactModule>(),
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = typeof initial === 'function' ? initial() : initial;
    return [hooks.slots[index], (next: unknown) => {
      hooks.slots[index] = typeof next === 'function' ? next(hooks.slots[index]) : next;
    }];
  },
  useRef: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
    return hooks.slots[index];
  },
  useEffect: (effect: () => void, deps: unknown[]) => {
    const index = hooks.cursor++;
    const previous = hooks.slots[index] as unknown[] | undefined;
    if (!previous || deps.some((dep, i) => !Object.is(dep, previous[i]))) hooks.effects.push(effect);
    hooks.slots[index] = deps;
  },
  useCallback: (callback: unknown, deps: unknown[]) => {
    const index = hooks.cursor++;
    const previous = hooks.slots[index] as { callback: unknown; deps: unknown[] } | undefined;
    if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) hooks.slots[index] = { callback, deps };
    return (hooks.slots[index] as { callback: unknown }).callback;
  },
  useTransition: () => [false, (action: () => void) => action()],
  use: () => hooks.data,
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => hooks.t, useLocale: () => 'en' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/features/demo', () => ({ useDemoExpiry: () => null }));
type Node = ReactElement<Record<string, unknown>>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!isValidElement<Record<string, unknown>>(value)) return [];
  return [value, ...nodes(value.props.children)];
}
function deferred<T>() {
  let resolve: (result: T) => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
async function settle() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
beforeEach(() => {
  hooks.slots = []; hooks.cursor = 0; hooks.effects = [];
  vi.clearAllMocks();
});

import { RosterScreen } from './components/roster-screen';
import { RosterRow } from './components/roster-row';
import { archivePlayer } from './data/archive-player';
import type { RosterPlayer } from './types';
vi.mock('./data/archive-player', () => ({ archivePlayer: vi.fn() }));
vi.mock('./components/invite-sheet', () => ({ InviteSheet: () => null }));
const players: RosterPlayer[] = ['a', 'b'].map(playerId => ({
  playerId, fullName: playerId, accessUntil: '2026-12-03', startedOn: '2026-10-01',
  lastTrainingDate: null, programTitle: null, openTasks: 0,
}));
function render() {
  hooks.cursor = 0; hooks.data = [{ players }, 'Captain'];
  return RosterScreen({ data: Promise.resolve([{ players }, 'Captain']), today: '2026-11-03' });
}
it.each(['error', 'throw'])('archives immediately and restores the row with an error on %s', async mode => {
  const request = deferred<{ error: string }>();
  vi.mocked(archivePlayer).mockReturnValue(request.promise);
  const before = nodes(render()).filter(node => node.type === RosterRow);
  const archive = before[0]?.props.onArchive as () => void;
  archive(); archive();
  expect(archivePlayer).toHaveBeenCalledTimes(1);
  expect(nodes(render()).filter(node => node.type === RosterRow).map(node => node.props.player)).toEqual([players[1]]);
  if (mode === 'error') request.resolve({ error: 'denied' }); else request.reject(new Error('network'));
  await settle();
  const restored = nodes(render()).filter(node => node.type === RosterRow);
  expect(restored.map(node => node.props.player)).toEqual(players);
  expect(restored[0]?.props.error).toBe(mode === 'error' ? 'denied' : 'couldntArchiveTryAgain');
});
it('keeps a successful archive hidden when another archive fails', async () => {
  const first = deferred<{ success: true }>();
  const second = deferred<{ error: string }>();
  vi.mocked(archivePlayer).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  for (const row of nodes(render()).filter(node => node.type === RosterRow)) (row.props.onArchive as () => void)();
  first.resolve({ success: true }); second.resolve({ error: 'denied' });
  await settle();
  expect(nodes(render()).filter(node => node.type === RosterRow).map(node => node.props.player)).toEqual([players[1]]);
});

