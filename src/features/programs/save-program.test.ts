vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
import { beforeEach, expect, it, vi } from 'vitest';
import { saveProgram } from './data/program-io';
import type { ProgramDraft } from './types';

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
    reps_max: 12, rest_seconds: 90, superset_group: null, rir, library: null };
  expect(await saveProgram({ ...draft, days: [{ id: dayId, program_id: draft.id, title: 'Day', position: 1,
    exercises: [row] }] })).toEqual({ ok: true, data: true });
  expect(rpc.mock.calls[0]?.[1].p_draft.days[0].exercises[0]).toMatchObject({ rir });
});
it.each([-1, 6, 2.5, NaN])('rejects invalid RIR %s before writing', async rir => {
  const dayId = '01900000-0000-7000-8000-000000000003';
  const row = { id: '01900000-0000-7000-8000-000000000004', day_id: dayId,
    exercise_id: '01900000-0000-7000-8000-000000000005', position: 1, sets: 3, reps_min: 8,
    reps_max: 12, rest_seconds: 90, superset_group: null, rir, library: null };
  expect(await saveProgram({ ...draft, days: [{ id: dayId, program_id: draft.id, title: 'Day', position: 1,
    exercises: [row] }] })).toMatchObject({ ok: false });
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
