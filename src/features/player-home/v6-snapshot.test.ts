import { afterEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { mapProgramSnapshot } from './data/program-snapshot';
import type { ProgramResponse } from './data/program-snapshot';

afterEach(() => vi.unstubAllEnvs());
const program: ProgramResponse = { id: 'p', title: 'Plan', notes: null, settings: {}, program_days: [{
  id: 'day', title: 'Push', position: 1, program_exercises: [{ id: 'prescription', exercise_id: 'exercise',
    position: 1, sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 90, superset_group: null,
    rpe: null, tempo: null, notes: null,
    exercises: { name_ar: 'بنش', name_en: 'Bench press', media_path: null, body_part: 'chest' } }],
}] };

// The pain check (T-317) reads body_part offline, so it is stored whatever the workspace flag says.
it('stores muscle metadata offline in every build', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  expect(mapProgramSnapshot(program, [4], 'player').days[0]?.exercises[0]).toMatchObject({ body_part: 'chest' });
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  expect(mapProgramSnapshot(program, [4], 'player').days[0]?.exercises[0]).toMatchObject({ body_part: 'chest' });
});
