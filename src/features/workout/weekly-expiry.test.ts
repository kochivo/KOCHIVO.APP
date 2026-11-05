import { expect, it, vi } from 'vitest';
import type { ProgramSnapshot } from '@/core/offline';
import type * as Offline from '@/core/offline';
import { createT } from '@/core/i18n/messages';
import { useFocusSession } from './hooks/use-focus-session';

const state = vi.hoisted(() => ({ snapshot: null as ProgramSnapshot | null }));
vi.mock('@/core/i18n/client', () => ({ useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'en') }));
vi.mock('react', () => ({ useState: (value: unknown) => [value, () => undefined],
  useRef: (current: unknown) => ({ current }), useEffect: () => undefined,
  useCallback: (callback: unknown) => callback, useMemo: (callback: () => unknown) => callback() }));
vi.mock('@/core/offline', async original => ({ ...await original<typeof Offline>(), useLiveQuery: () => undefined }));
vi.mock('@/features/player-home', () => ({ useProgramSnapshot: () => ({ snapshot: state.snapshot, status: 'ready' }) }));
vi.mock('./hooks/use-last-session', () => ({ useLastSession: () => ({ last: null, ready: true }) }));
vi.mock('./hooks/use-rest-timer', () => ({ useRestTimer: () => ({ remaining: 0 }) }));

it('blocks an expired weekly workout opened by its saved URL while keeping legacy workouts available', () => {
  state.snapshot = { id: 'active', player_id: 'p', program_id: 'program', title: 'Week', notes: null,
    settings: { repeatWeekly: false }, starts_on: '2026-10-31', training_days: [],
    days: [{ id: 'day', position: 1, title: 'Strength', weekday: 0, is_rest_day: false, exercises: [] }] };
  expect(useFocusSession('day', '2026-11-07', 'p').day).toBeUndefined();
  expect(useFocusSession('day', '2026-11-07', 'p').programFinished).toBe(true);
  state.snapshot.starts_on = '2026-11-07';
  expect(useFocusSession('day', '2026-11-07', 'p').day?.id).toBe('day');
  state.snapshot.days = state.snapshot.days.map(day => ({ ...day, weekday: null }));
  expect(useFocusSession('day', '2026-12-01', 'p').day?.id).toBe('day');
});
