vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
import { beforeEach, expect, it, vi } from 'vitest';
import { saveProgram } from './data/program-io';
import type { ProgramDraft } from './types';
import { emptyWarmup } from './warmup';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({ rpc,
  auth: { getClaims: async () => ({ data: { claims: { sub: 'captain' } }, error: null }) },
}) }));
const draft: ProgramDraft = { id: '01900000-0000-7000-8000-000000000001',
  player_id: '01900000-0000-7000-8000-000000000002', title: 'Program', status: 'draft', days: [] };
beforeEach(() => vi.resetAllMocks());
it.each([null, 0, 2, 5])('keeps RIR %s in the save payload', async rir => {
  rpc.mockResolvedValue({ error: null });
  const dayId = '01900000-0000-7000-8000-000000000003';
  const row = { id: '01900000-0000-7000-8000-000000000004', day_id: dayId,
    exercise_id: '01900000-0000-7000-8000-000000000005', position: 1, sets: 3, reps_min: 8,
    reps_max: 12, rest_seconds: 90, superset_group: null, rir, notes: null, library: null };
  expect(await saveProgram({ ...draft, days: [{ id: dayId, program_id: draft.id, title: 'Day', position: 1,
    exercises: [row], warmup: emptyWarmup() }] })).toEqual({ ok: true, data: true });
  expect(rpc.mock.calls[0]?.[1].p_draft.days[0].exercises[0]).toMatchObject({ rir });
});
it.each([-1, 6, 2.5, NaN])('rejects invalid RIR %s before writing', async rir => {
  const dayId = '01900000-0000-7000-8000-000000000003';
  const row = { id: '01900000-0000-7000-8000-000000000004', day_id: dayId,
    exercise_id: '01900000-0000-7000-8000-000000000005', position: 1, sets: 3, reps_min: 8,
    reps_max: 12, rest_seconds: 90, superset_group: null, rir, notes: null, library: null };
  expect(await saveProgram({ ...draft, days: [{ id: dayId, program_id: draft.id, title: 'Day', position: 1,
    exercises: [row], warmup: emptyWarmup() }] })).toMatchObject({ ok: false });
  expect(rpc).not.toHaveBeenCalled();
});
it('saves a template without a player', async () => {
  rpc.mockResolvedValue({ error: null });
  expect(await saveProgram({ ...draft, player_id: null })).toEqual({ ok: true, data: true });
  expect(rpc).toHaveBeenCalledWith('save_weekly_program', { p_draft: {
    id: draft.id, player_id: null, title: 'Program', days: [],
  } });
});
it('returns a validation error without writing', async () => {
  await expect(saveProgram({ ...draft, title: '' })).resolves.toMatchObject({ ok: false, error: expect.any(String) });
  expect(rpc).not.toHaveBeenCalled();
});
it('returns a safe error for a failed save', async () => {
  rpc.mockResolvedValue({ error: { message: 'private details' } });
  const result = await saveProgram(draft);
  expect(result).toMatchObject({ ok: false, error: expect.any(String) });
  expect(result).not.toHaveProperty('error', 'private details');
});
it('returns success after saving the draft', async () => {
  rpc.mockResolvedValue({ error: null });
  await expect(saveProgram(draft)).resolves.toEqual({ ok: true, data: true });
  expect(rpc).toHaveBeenCalledWith('save_weekly_program', {
    p_draft: { id: draft.id, player_id: draft.player_id, title: 'Program', days: [] },
  });
});

it('saves both fields and rejects a mismatched plan, duplicates or the original exercise', async () => {
  rpc.mockResolvedValue({ error: null });
  const dayId = '01900000-0000-7000-8000-000000000003';
  const exerciseId = '01900000-0000-7000-8000-000000000005';
  const alternative = '01900000-0000-7000-8000-000000000006';
  const plan = Array.from({ length: 3 }, () => ({ reps_min: 10, reps_max: 10, rir: 2 }));
  const row = { id: '01900000-0000-7000-8000-000000000004', day_id: dayId, exercise_id: exerciseId,
    position: 1, sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 90, superset_group: null, rir: null,
    notes: null, library: null, alternatives: [alternative], set_plan: plan };
  const input = { ...draft, days: [{ id: dayId, program_id: draft.id, title: 'Day', position: 1,
    warmup: emptyWarmup(), exercises: [row] }] };
  expect(await saveProgram(input)).toEqual({ ok: true, data: true });
  expect(rpc.mock.calls[0]?.[1].p_draft.days[0].exercises[0]).toMatchObject({ alternatives: [alternative], set_plan: plan });
  for (const patch of [{ sets: 4 }, { alternatives: [alternative, alternative] }, { alternatives: [exerciseId] }]) {
    rpc.mockClear();
    expect(await saveProgram({ ...input, days: input.days.map(day => ({ ...day, exercises: [{ ...row, ...patch }] })) })).toMatchObject({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  }
});
