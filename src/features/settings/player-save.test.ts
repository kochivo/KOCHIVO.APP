import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { saveProfile } from './data/settings';

const mock = vi.hoisted(() => ({ role: 'player', update: vi.fn(), remove: vi.fn() }));
vi.mock('@/core/i18n/server', () => ({ getT: async () => createT(messages, 'en') }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'self' } } }) },
  from: () => ({
    select: () => ({ eq: () => ({ single: async () => ({ data: { role: mock.role, avatar_path: 'self/old.webp' } }) }) }),
    update: mock.update,
  }), storage: { from: () => ({ remove: mock.remove }) },
}) }));
beforeEach(() => {
  vi.clearAllMocks(); mock.role = 'player'; mock.remove.mockResolvedValue({ error: null });
  mock.update.mockImplementation(input => ({ eq: () => ({ select: () => ({ single: async () => ({ data: input }) }) }) }));
});
it('saves a player name with an empty phone', async () => {
  expect((await saveProfile({ full_name: 'Ali', phone: '' })).data).toMatchObject({ full_name: 'Ali', phone: null });
});
it('requires a captain phone', async () => {
  mock.role = 'captain';
  expect((await saveProfile({ full_name: 'Ali', phone: '' })).error).toBeDefined();
  expect(mock.update).not.toHaveBeenCalled();
});
it.each(['captain', 'player'])('rejects a malformed phone for %s', async role => {
  mock.role = role;
  expect((await saveProfile({ full_name: 'Ali', phone: '123' })).error).toBeDefined();
  expect(mock.update).not.toHaveBeenCalled();
});
it('rejects a foreign avatar and cleans up the old owned avatar after success', async () => {
  expect((await saveProfile({ full_name: 'Ali', phone: '', avatar_path: 'other/new.webp' })).error).toBeDefined();
  expect(mock.update).not.toHaveBeenCalled();
  await saveProfile({ full_name: 'Ali', phone: '', avatar_path: 'self/new.webp' });
  expect(mock.remove).toHaveBeenCalledWith(['self/old.webp']);
});
