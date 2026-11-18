import type * as React from 'react';
import { expect, it, vi } from 'vitest';
import type { RankData, RankStatus } from './hooks/use-rank-data';
import { useRankData } from './hooks/use-rank-data';

const model = vi.hoisted(() => ({
  state: {} as { data: RankData; status: RankStatus },
  loadHall: vi.fn(),
  loadPoints: vi.fn(),
}));

vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof React>(),
  useState: (initial: unknown) => typeof initial === 'number' ? [initial, vi.fn()] :
    [model.state, (update: (state: typeof model.state) => typeof model.state) => { model.state = update(model.state); }],
  useRef: (current: unknown) => ({ current }),
  useCallback: (callback: unknown) => callback,
  useEffect: () => {},
}));
vi.mock('@/core/timezone/client', () => ({ useTimezone: () => 'Africa/Cairo' }));
vi.mock('./data/load-hall-of-fame', () => ({ loadHallOfFame: model.loadHall }));
vi.mock('./data/load-my-points', () => ({ loadMyPoints: model.loadPoints }));

it('retries Hall of Fame while keeping the loaded rank and board visible', async () => {
  const points = { lifetime: 99, tier: 'beginner', monthly: 0, month_position: null, crown_gap: 0,
    adherence: 0, done: 0, planned: 0, crown_needs_workouts: 0, logs: [] } as const;
  const data: RankData = { points: { ...points, logs: [] }, board: [], hallError: true };
  model.state = { status: 'ready', data };
  const rows = [{ month: '2026-10-01', display_name: 'Mona', adherence: 95 }];
  let finish: (value: typeof rows) => void = () => {};
  model.loadHall.mockReturnValue(new Promise<typeof rows>(resolve => { finish = resolve; }));
  const pending = useRankData().retryHall();
  expect(model.state).toEqual({ status: 'ready', data: { ...data, hallError: false } });
  finish(rows);
  await pending;
  expect(model.state.data.hall).toEqual(rows);
  expect(model.loadHall).toHaveBeenCalledOnce();
  expect(model.loadPoints).not.toHaveBeenCalled();
});
