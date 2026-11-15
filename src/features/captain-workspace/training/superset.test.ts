import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import type { DraftExercise, ProgramDraft } from '@/features/programs';
import { emptyWarmup } from '@/features/programs';
import { linkAbove, linkNext } from './editor-draft';
import { supersetLabel, supersetTag } from '@/lib/superset';

const rows: DraftExercise[] = [1, 2, 3, 4].map(n => ({ id: String(n), day_id: 'd', exercise_id: String(n),
  position: n, sets: n, reps_min: 8, reps_max: 12, rest_seconds: 90, superset_group: null,
  rir: null, notes: null, library: null }));
const draft: ProgramDraft = { id: 'p', player_id: null, title: 'P', status: 'draft',
  days: [{ id: 'd', program_id: 'p', position: 1, title: 'Day', warmup: emptyWarmup(), exercises: rows }] };
it('aligns set counts to the maximum and refuses a fourth member', () => {
  let next = linkNext(draft, 'd', '1');
  expect(next.days[0]?.exercises.slice(0, 2).map(row => row.sets)).toEqual([2, 2]);
  next = linkAbove(next, 'd', '3');
  expect(next.days[0]?.exercises.slice(0, 3).map(row => row.sets)).toEqual([3, 3, 3]);
  const full = next;
  next = linkAbove(next, 'd', '4');
  expect(next).toEqual(full);
  const members = next.days[0]?.exercises ?? [];
  expect(members.map(row => supersetTag(members, row))).toEqual(['A1', 'A2', 'A3', null]);
  expect(supersetLabel([{ id: 'a', superset_group: 9 }, { id: 'b', superset_group: 2 }], { id: 'b', superset_group: 2 })).toBe('B');
});
it('links the chosen neighbours without merging an unrelated group above them', () => {
  const paired = linkNext(draft, 'd', '1');
  for (const next of [linkNext(paired, 'd', '3'), linkAbove(paired, 'd', '4')]) {
    const rows = next.days[0]?.exercises ?? [];
    expect(rows.map(row => supersetTag(rows, row))).toEqual(['A1', 'A2', 'B1', 'B2']);
  }
});
