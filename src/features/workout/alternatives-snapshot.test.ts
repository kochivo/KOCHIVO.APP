import { expect, it, vi } from 'vitest';
import { KochivoDB } from '@/core/offline';
import { mapProgramSnapshot } from '@/features/player-home';
import type { ProgramResponse } from '@/features/player-home';
import { targetForSet } from '@/features/programs';
vi.mock('server-only', () => ({}));

const exercise = { id: 'row', exercise_id: 'bench', position: 1, sets: 2, reps_min: 8, reps_max: 12,
  rest_seconds: 90, superset_group: null, rpe: null, tempo: null, notes: null,
  exercises: { name_ar: null, name_en: 'Bench', media_path: null } };
const program: ProgramResponse = { id: 'p', title: 'Plan', notes: null, settings: {},
  program_days: [{ id: 'day', title: 'Push', position: 1, program_exercises: [exercise] }] };
it('reads an older cached snapshot with no fields using the original uniform targets', () => {
  const snapshot = mapProgramSnapshot(program, [], 'player');
  const row = snapshot.days[0]?.exercises[0];
  if (!row) throw new Error('Missing fixture');
  expect(row).not.toHaveProperty('set_plan'); expect(row).not.toHaveProperty('alternatives');
  expect(targetForSet(row, 1)).toEqual({ reps_min: 8, reps_max: 12, rir: null });
});
it('caches alternatives, thumbnails and every set target for offline reload', async () => {
  const db = new KochivoDB('alternatives-snapshot');
  const set_plan = [{ reps_min: 12, reps_max: 12, rir: 2 }, { reps_min: 8, reps_max: null, rir: 0 }];
  const alternative = { id: 'press', name_ar: null, name_en: 'Press', media_path: 'press.gif', video_url: null };
  const snapshot = mapProgramSnapshot({ ...program, program_days: [{ id: 'day', title: 'Push', position: 1,
    program_exercises: [{ ...exercise, alternatives: ['press'], set_plan }] }] }, [], 'player', [alternative]);
  try {
    await db.program_snapshot.put(snapshot); db.close(); await db.open();
    const row = (await db.program_snapshot.get('active'))?.days[0]?.exercises[0];
    expect(row).toMatchObject({ alternatives: ['press'], alternative_exercises: [alternative], set_plan });
    if (!row) throw new Error('Missing cached fixture');
    expect(targetForSet(row, 1)).toEqual(set_plan[1]); expect(await db.outbox.count()).toBe(0);
  } finally { await db.delete(); }
});
