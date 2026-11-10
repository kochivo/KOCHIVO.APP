import { afterEach, expect, it, vi } from 'vitest';
import type * as PrizeData from './data/save-crown-prize';

const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[], effects: [] as (() => void)[] }));
vi.mock('react', () => ({
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = typeof initial === 'function' ? initial() : initial;
    return [hooks.slots[index], (value: unknown) => {
      hooks.slots[index] = typeof value === 'function' ? value(hooks.slots[index]) : value;
    }];
  },
  useRef: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
    return hooks.slots[index];
  },
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => void, dependencies: unknown[]) => {
    const index = hooks.cursor++;
    const previous = hooks.slots[index] as unknown[] | undefined;
    if (!previous || dependencies.some((value, i) => !Object.is(value, previous[i]))) hooks.effects.push(effect);
    hooks.slots[index] = dependencies;
  },
}));
const loads = vi.hoisted(() => new Map<string, Promise<string>>());
vi.mock('@/features/ranks', () => ({
  loadHallOfFame: async () => [],
  loadLeaderboard: async () => [], loadCrownPrize: (month: string) => loads.get(month) ?? Promise.resolve('Old prize'),
}));
const writes = vi.hoisted(() => new Map<string, { resolve: () => void; reject: () => void }>());
vi.mock('./data/save-crown-prize', async original => ({
  ...await original<typeof PrizeData>(),
  saveCrownPrize: (month: string) => new Promise<void>((resolve, reject) => {
    writes.set(month, { resolve, reject: () => reject(new Error('offline')) });
  }),
}));
import { useLeaderboard as runLeaderboard } from './hooks/use-leaderboard';

afterEach(() => { hooks.slots = []; hooks.effects = []; writes.clear(); loads.clear(); vi.unstubAllGlobals(); });
const render = () => {
  hooks.cursor = 0;
  const board = runLeaderboard(new Date('2026-11-10T12:00:00Z'));
  for (const effect of hooks.effects.splice(0)) effect();
  return board;
};
const loaded = async () => {
  // Promise.all plus its result handler must settle before the next simulated render.
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  return render();
};

it('keeps month-specific optimistic values and errors when saves resolve in reverse order', async () => {
  vi.stubGlobal('window', { addEventListener: () => {}, removeEventListener: () => {} });
  render(); let board = await loaded();
  const november = board.savePrize('November prize');
  board.setMonth('2026-12-01'); render(); board = await loaded();
  const december = board.savePrize('December prize');
  expect(render().prize).toBe('December prize');
  writes.get('2026-12-01')?.resolve(); await december;
  writes.get('2026-11-01')?.resolve(); await november;
  board = render();
  expect(board.prize).toBe('December prize');
  expect(board.prizeSaving).toBe(false);
  const failure = board.savePrize('Bad edit');
  writes.get('2026-12-01')?.reject(); await expect(failure).rejects.toThrow('offline');
  board = render();
  expect(board.prize).toBe('December prize');
  expect(board.prizeError).toBe(true);
});

it('keeps a completed save when a read started during that save returns stale data', async () => {
  vi.stubGlobal('window', { addEventListener: () => {}, removeEventListener: () => {} });
  render(); let board = await loaded();
  const saving = board.savePrize('Saved prize');
  board.setMonth('2026-12-01'); render(); board = await loaded();
  let completeRead: ((value: string) => void) | undefined;
  loads.set('2026-11-01', new Promise(resolve => { completeRead = resolve; }));
  board.setMonth('2026-11-01'); render();
  writes.get('2026-11-01')?.resolve(); await saving;
  completeRead?.('Old prize'); board = await loaded();
  expect(board.prize).toBe('Saved prize');
  expect(board.prizeSaving).toBe(false);
});
