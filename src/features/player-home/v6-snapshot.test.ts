import { afterEach, expect, it, vi } from 'vitest';
import { mapProgramSnapshot } from './data/program-snapshot';
import type { ProgramResponse } from './data/program-snapshot';

afterEach(() => vi.unstubAllEnvs());
const program: ProgramResponse = { id: 'p', title: 'Plan', notes: null, settings: {}, program_days: [{
  id: 'day', title: 'Push', position: 1, program_exercises: [{ id: 'prescription', exercise_id: 'exercise',
    position: 1, sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 90, superset_group: null,
    rpe: null, tempo: null, notes: null,
    exercises: { name_ar: 'بنش', name_en: 'Bench press', media_path: null, body_part: 'chest' } }],
}] };

it('stores muscle metadata for offline v6 headers without changing flag-off snapshots', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  expect(mapProgramSnapshot(program, [4], 'player').days[0]?.exercises[0]).toMatchObject({ body_part: 'chest' });
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  expect(mapProgramSnapshot(program, [4], 'player').days[0]?.exercises[0]).not.toHaveProperty('body_part');
});
