import { beforeEach, expect, it, vi } from 'vitest';
import { emptyWarmup, saveProgram } from '@/features/programs';
import type { ProgramDraft } from '@/features/programs';
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({ rpc,
  auth: { getClaims: async () => ({ data: { claims: { sub: 'captain' } }, error: null }) },
}) }));
function draft(notes: string | null): ProgramDraft {
  const id = '01900000-0000-7000-8000-000000000001', day = '01900000-0000-7000-8000-000000000002';
  return { id, player_id: null, title: 'Template', status: 'draft', days: [{ id: day, program_id: id,
    title: 'Push', position: 1, warmup: emptyWarmup(), exercises: [{
      id: '01900000-0000-7000-8000-000000000003', day_id: day, exercise_id: '01900000-0000-7000-8000-000000000004',
      position: 1, sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 90, rir: 2, superset_group: null, library: null, notes,
    }] }] };
}
beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({ error: null }); });
it.each([['  Slow descent  ', 'Slow descent'], ['', null], ['   ', null], [null, null]])('normalizes notes %j to %j in the RPC payload', async (input, expected) => {
  expect(await saveProgram(draft(input))).toEqual({ ok: true, data: true });
  expect(rpc.mock.calls[0]?.[1].p_draft.days[0].exercises[0].notes).toBe(expected);
});
it('rejects notes longer than 200 characters without sending a write', async () => {
  expect(await saveProgram(draft('x'.repeat(201)))).toMatchObject({ ok: false });
  expect(rpc).not.toHaveBeenCalled();
});
