import { expect, it, vi } from 'vitest';
import { loadProgram } from './program-io';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getClaims: async () => ({ data: { claims: { sub: 'captain' } }, error: null }) },
  from: mocks.from,
}) }));

it('batches days, overlaps exercises and cardio, and preserves each day order', async () => {
  let release = () => {};
  const rows = [
    { id: 'e2', day_id: 'd2', exercise_id: 'library', position: 1, rir: 2, alternatives: ['alt'],
      set_plan: [{ reps_min: 10, reps_max: 10, rir: 1 }] },
    { id: 'e1', day_id: 'd1', exercise_id: 'library', position: 1, rir: null },
  ];
  const pending = new Promise<{ data: typeof rows; error: null }>(resolve => {
    release = () => resolve({ data: rows, error: null });
  });
  const results: Record<string, unknown> = {
    programs: { id: 'program', settings: {} },
    program_days: [{ id: 'd1', position: 1 }, { id: 'd2', position: 2 }],
    program_cardio: [], exercises: [{ id: 'library', name_en: 'Squat' }, { id: 'alt', name_en: 'Press' }],
  };
  const filters: [string, string, unknown][] = [];
  mocks.from.mockImplementation((table: string) => {
    const result = { data: results[table], error: null };
    const query = {
      select: () => query, eq: () => query,
      in: (column: string, values: unknown) => { filters.push([table, column, values]); return query; },
      single: async () => result,
      order: () => table === 'program_exercises' ? pending : Promise.resolve(result),
      then: (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve),
    };
    return query;
  });
  const loading = loadProgram('01900000-0000-7000-8000-000000000001');
  try {
    for (let step = 0; step < 30; step++) await Promise.resolve();
    expect(mocks.from).toHaveBeenCalledWith('program_cardio');
  } finally { release(); }
  const result = await loading;
  expect(result.data?.days.map(day => [day.id, day.exercises.map(row => row.id)]))
    .toEqual([['d1', ['e1']], ['d2', ['e2']]]);
  expect(filters).toContainEqual(['program_exercises', 'day_id', ['d1', 'd2']]);
  expect(filters).toContainEqual(['program_cardio', 'day_id', ['d1', 'd2']]);
  expect(filters).toContainEqual(['exercises', 'id', ['library', 'alt']]);
  expect(mocks.from).toHaveBeenCalledTimes(5);
  expect(result.data?.days.map(day => day.exercises[0]?.rir)).toEqual([null, 2]);
  expect(result.data?.days[1]?.exercises[0]).toMatchObject({ alternatives: ['alt'],
    alternative_library: [{ id: 'alt', name_en: 'Press' }], set_plan: [{ reps_min: 10, reps_max: 10, rir: 1 }] });
});
