import { expect, it } from 'vitest';
import type { SetLogRow } from '@/core/offline';
import { finishSummary } from './data/finish-summary';

it('summarises only live session sets and counts records against earlier performances', () => {
  const set = (id: string, session: string, weight: number, at: string, deleted: string | null = null): SetLogRow => ({
    id, session_id: session, exercise_id: 'bench', program_exercise_id: 'p', set_index: 0,
    weight_kg: weight, reps: 10, completed_at: at, deleted_at: deleted, client_updated_at: at,
  });
  const rows = [set('old', 'old', 40, '2026-11-10T10:00:00Z'),
    set('a', 'today', 45, '2026-11-12T10:00:00Z'), set('b', 'today', 50, '2026-11-12T10:02:00Z'),
    set('deleted', 'today', 99, '2026-11-12T10:04:00Z', '2026-11-12T10:05:00Z'),
    set('future', 'future', 99, '2026-11-13T10:00:00Z')];
  expect(finishSummary(rows, 'today')).toEqual({ sets: 2, volume: 950, records: 2 });
});
