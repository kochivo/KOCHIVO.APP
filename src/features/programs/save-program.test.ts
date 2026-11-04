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
