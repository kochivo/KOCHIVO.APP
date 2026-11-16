import { afterEach, expect, it, vi } from 'vitest';
import { useLastSession } from './hooks/use-last-session';

const state = vi.hoisted(() => ({ remote: null as unknown, effects: [] as (() => void)[], reads: 0 }));
vi.mock('react', () => ({
  useCallback: <T,>(value: T) => value,
  useEffect: (effect: () => void) => { state.effects.push(effect); },
  useState: () => [state.remote, (value: unknown) => { state.remote = value; }],
}));
vi.mock('@/core/offline', () => ({ localDb: () => ({}), useLiveQuery: () => ({
  key: 'player:bench:today:0', value: { completedAt: '2026-11-14T10:00:00Z', sets: [{ set_index: 1, weight_kg: 50, reps: 8 }] },
}) }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({}) }));
vi.mock('./data/remote-last-session', () => ({ remoteLastSession: async () => {
  state.reads++;
  return { completedAt: '2026-11-15T10:00:00Z', sets: [{ set_index: 1, weight_kg: 60, reps: 8 }] };
} }));
afterEach(() => { state.remote = null; state.effects = []; state.reads = 0; vi.unstubAllGlobals(); });

it('checks the server despite local history and then suggests the newer workout', async () => {
  vi.stubGlobal('navigator', { onLine: true });
  expect(useLastSession('player', 'bench', 'today', () => {}, 0).last?.sets[0]?.weight_kg).toBe(50);
  state.effects[0]?.();
  for (let i = 0; i < 10; i++) await Promise.resolve();
  expect(state.reads).toBe(1);
  expect(useLastSession('player', 'bench', 'today', () => {}, 0).last?.sets[0]?.weight_kg).toBe(60);
});
it('keeps local suggestions available offline without a server read', () => {
  vi.stubGlobal('navigator', { onLine: false });
  const result = useLastSession('player', 'bench', 'today', () => {}, 0);
  state.effects[0]?.();
  expect(result.ready).toBe(true);
  expect(result.last?.sets[0]?.weight_kg).toBe(50);
  expect(state.reads).toBe(0);
});

it('checks the server when an offline workout reconnects', async () => {
  const connection = { onLine: false };
  const window = new EventTarget();
  vi.stubGlobal('navigator', connection);
  vi.stubGlobal('window', window);
  useLastSession('player', 'bench', 'today', () => {}, 0);
  state.effects[0]?.();
  connection.onLine = true;
  window.dispatchEvent(new Event('online'));
  for (let i = 0; i < 10; i++) await Promise.resolve();
  expect(useLastSession('player', 'bench', 'today', () => {}, 0).last?.sets[0]?.weight_kg).toBe(60);
});
