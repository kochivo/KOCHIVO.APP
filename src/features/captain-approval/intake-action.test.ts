import { beforeEach, expect, it, vi } from 'vitest';
import { loadIntake, saveIntake } from './data/intake';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), single: vi.fn(), update: vi.fn(), eq: vi.fn(), is: vi.fn(), revalidate: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'en' }) }) }));
vi.mock('next/navigation', () => ({ unstable_rethrow: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => {
  const query = { select: () => query, eq: mocks.eq, is: mocks.is, single: mocks.single, update: mocks.update };
  mocks.eq.mockReturnValue(query); mocks.is.mockReturnValue(query); mocks.update.mockReturnValue(query);
  return { auth: { getUser: mocks.getUser }, from: () => query };
} }));
const input = { full_name: ' Coach ', whatsapp: '٠١٠١٢٣٤٥٦٧٨', instagram: '@coach',
  current_tool: 'other_app', main_challenge: 'tracking_progress', players_range: '11-50' };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'self' } }, error: null });
  mocks.single.mockResolvedValueOnce({ data: { social: { youtube: 'my-channel', whatsapp: 'old' } }, error: null })
    .mockResolvedValueOnce({ data: { id: 'self' }, error: null });
});
it('saves normalized details together while preserving other social keys', async () => {
  expect(await saveIntake(input)).toEqual({ success: true });
  expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ full_name: 'Coach',
    social: { youtube: 'my-channel', whatsapp: '+201012345678', instagram: 'coach' },
    captain_intake: { current_tool: 'other_app', main_challenge: 'tracking_progress', players_range: '11-50' } });
  expect(mocks.eq).toHaveBeenCalledWith('id', 'self');
  expect(mocks.eq).toHaveBeenCalledWith('captain_status', 'pending');
  expect(mocks.is).toHaveBeenCalledWith('captain_intake', null);
  expect(mocks.revalidate).toHaveBeenCalledWith('/captain/pending');
});
it('rejects invalid input before making a database write', async () => {
  expect(await saveIntake({ ...input, whatsapp: '123' })).toHaveProperty('error');
  expect(mocks.update).not.toHaveBeenCalled();
});
it('rejects unauthenticated requests', async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect(await saveIntake(input)).toHaveProperty('error');
  expect(mocks.update).not.toHaveBeenCalled();
});
it('reports a failed update without claiming submission succeeded', async () => {
  mocks.single.mockReset().mockResolvedValueOnce({ data: { social: {} }, error: null })
    .mockResolvedValueOnce({ data: null, error: { code: '42501' } });
  expect(await saveIntake(input)).toHaveProperty('error');
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
it('returns a safe error when loading fails', async () => {
  mocks.getUser.mockRejectedValue(new Error('network'));
  expect(await loadIntake()).toEqual({ profile: null, error: 'Could not load your details. Try again.' });
});
