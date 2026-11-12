import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { saveCaptainProfile } from './data/settings';

const mock = vi.hoisted(() => ({ getUser: vi.fn(), previous: vi.fn(), updated: vi.fn(), remove: vi.fn(), update: vi.fn() }));
vi.mock('@/core/i18n/server', () => ({ getT: async () => createT(messages, 'en') }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getUser: mock.getUser },
  from: () => ({
    select: () => ({ eq: () => ({ single: mock.previous }) }),
    update: mock.update,
  }), storage: { from: () => ({ remove: mock.remove }) },
}) }));
const input = { full_name: 'Ali', bio: 'Coach', location: 'Cairo', timezone: 'Africa/Cairo', units: 'metric',
  social: {}, avatar_path: 'captain/new.webp' };
beforeEach(() => {
  vi.clearAllMocks();
  mock.getUser.mockResolvedValue({ data: { user: { id: 'captain' } } });
  mock.previous.mockResolvedValue({ data: { avatar_path: 'captain/old.webp' } });
  mock.update.mockReturnValue({ eq: () => ({ eq: () => ({ select: () => ({ single: mock.updated }) }) }) });
  mock.updated.mockResolvedValue({ data: { id: 'captain', ...input } });
  mock.remove.mockResolvedValue({ error: null });
});
it('deletes the old avatar only after the profile save succeeds', async () => {
  expect((await saveCaptainProfile(input)).data?.full_name).toBe('Ali');
  expect(mock.remove).toHaveBeenCalledWith(['captain/old.webp']);
  expect(mock.updated.mock.invocationCallOrder[0]).toBeLessThan(mock.remove.mock.invocationCallOrder[0] ?? 0);
});
it('keeps the old avatar when the profile update fails', async () => {
  mock.updated.mockResolvedValue({ error: { message: 'failed' } });
  expect((await saveCaptainProfile(input)).error).toBeDefined();
  expect(mock.remove).not.toHaveBeenCalled();
});
it('rejects a foreign avatar path before writing', async () => {
  expect((await saveCaptainProfile({ ...input, avatar_path: 'other/new.webp' })).error).toBeDefined();
  expect(mock.update).not.toHaveBeenCalled();
});
it('does not roll back a committed profile when old avatar cleanup throws', async () => {
  mock.remove.mockRejectedValue(new Error('storage unavailable'));
  expect((await saveCaptainProfile(input)).data?.full_name).toBe('Ali');
});
it('returns a slug field error for the production unique constraint failure', async () => {
  mock.updated.mockResolvedValue({ error: { code: '23505',
    message: 'duplicate key value violates unique constraint "profiles_public_slug_key"' } });
  expect(await saveCaptainProfile({ ...input, public_slug: 'taken' })).toEqual({
    error: 'This link is taken. Choose another link', fieldErrors: { public_slug: 'This link is taken. Choose another link' },
  });
  expect(mock.remove).not.toHaveBeenCalled();
});
it.each([
  { code: '23505', message: 'duplicate key value violates unique constraint "profiles_other_key"' },
  { code: '42501', message: 'profiles_public_slug_key' },
])('keeps unrelated database failures generic: %s', async error => {
  mock.updated.mockResolvedValue({ error });
  expect(await saveCaptainProfile(input)).toEqual({ error: "Couldn't save changes. Try again" });
});
