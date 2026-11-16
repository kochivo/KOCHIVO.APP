import { expect, it, vi } from 'vitest';
import type * as React from 'react';
import { createT } from '@/core/i18n/messages';
import { FinishHero } from './components/finish-hero';

const state = vi.hoisted(() => ({ index: 0, read: null as (() => Promise<unknown>) | null }));
const previous = { id: 'old', session_id: 'old', exercise_id: 'bench', program_exercise_id: 'p', set_index: 1,
  weight_kg: 50, reps: 8, completed_at: '2026-11-14T10:00:00Z', client_updated_at: '2026-11-14T10:00:00Z', deleted_at: null };
const current = { ...previous, id: 'today', session_id: 'today', weight_kg: 60, completed_at: '2026-11-16T10:00:00Z' };
vi.mock('server-only', () => ({}));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useCallback: <T,>(value: T) => value, useEffect: () => {},
  useState: (value: unknown) => {
    const index = state.index++;
    return [index === 3 ? [{ ...previous, weight_kg: 100, client_updated_at: '2026-11-15T10:00:00Z' }] : value, () => {}];
  },
}));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'en', useT: (m: Parameters<typeof createT>[0]) => createT(m, 'en') }));
vi.mock('@/features/ranks', () => ({ previewWorkoutPoints: () => undefined }));
vi.mock('@/lib/ranks-enabled', () => ({ ranksEnabled: () => false }));
vi.mock('@/core/offline', () => ({
  localDb: () => ({
    workout_sessions: { get: async () => ({ id: 'today', started_at: '2026-11-16T09:00:00Z', completed_at: '2026-11-16T11:00:00Z' }) },
    set_logs: { toArray: async () => [previous, current] }, program_snapshot: { get: async () => undefined },
  }),
  useLiveQuery: (read: () => Promise<unknown>) => { state.read = read; return undefined; },
}));

it('uses synced PR baselines for the finish record and expected points', async () => {
  state.index = 0;
  FinishHero({ sessionId: 'today' });
  expect(await state.read?.()).toMatchObject({ record: undefined, records: 0, expectedPrs: 0, sets: 1, volume: 480 });
});
