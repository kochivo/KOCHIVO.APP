import { beforeEach, expect, it, vi } from 'vitest';
import { saveCaptainWithAvatar } from './data/captain-avatar';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';

const mock = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn(), save: vi.fn(), compress: vi.fn() }));
vi.mock('@/core/offline/ids', () => ({ uuidv7: () => 'new-avatar' }));
vi.mock('@/lib/compress-image', () => ({ compressImage: mock.compress }));
vi.mock('./data/settings', () => ({ saveCaptainProfile: mock.save }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'captain' } } }) },
  storage: { from: () => ({ upload: mock.upload, remove: mock.remove }) },
}) }));
const t = createT(messages, 'en');
const input = { full_name: 'Ali', bio: '', location: '', timezone: 'Africa/Cairo', units: 'metric' as const, social: {} };
beforeEach(() => {
  vi.clearAllMocks();
  mock.compress.mockResolvedValue(new Blob(['photo'], { type: 'image/webp' }));
  mock.upload.mockResolvedValue({ error: null }); mock.remove.mockResolvedValue({ error: null });
  mock.save.mockResolvedValue({ data: { id: 'captain', ...input } });
});
it('uploads a compressed 256px WebP then saves its new path', async () => {
  const file = new File(['source'], 'photo.jpg', { type: 'image/jpeg' });
  await saveCaptainWithAvatar(input, file, t);
  expect(mock.compress).toHaveBeenCalledWith(file, 256, 0.8, t, true, 'image/webp');
  expect(mock.save).toHaveBeenCalledWith({ ...input, avatar_path: 'captain/new-avatar.webp' });
  expect(mock.upload.mock.invocationCallOrder[0]).toBeLessThan(mock.save.mock.invocationCallOrder[0] ?? 0);
  expect(mock.remove).not.toHaveBeenCalled();
});
it('removes only the new upload when the row save fails', async () => {
  mock.save.mockResolvedValue({ error: 'failed' });
  await expect(saveCaptainWithAvatar(input, new File(['source'], 'photo.jpg'), t)).rejects.toThrow('failed');
  expect(mock.remove).toHaveBeenCalledWith(['captain/new-avatar.webp']);
});
it('never saves a rejected or oversized upload', async () => {
  mock.compress.mockResolvedValue(new Blob([new Uint8Array(524289)], { type: 'image/webp' }));
  await expect(saveCaptainWithAvatar(input, new File(['source'], 'photo.jpg'), t)).rejects.toThrow();
  expect(mock.upload).not.toHaveBeenCalled(); expect(mock.save).not.toHaveBeenCalled();
});
it('falls back to JPEG where the browser cannot encode WebP (iPhone Safari)', async () => {
  mock.compress.mockRejectedValueOnce(new Error('unsupported')).mockResolvedValueOnce(new Blob(['photo'], { type: 'image/jpeg' }));
  const file = new File(['source'], 'photo.jpg', { type: 'image/jpeg' });
  await saveCaptainWithAvatar(input, file, t);
  expect(mock.compress).toHaveBeenLastCalledWith(file, 256, 0.8, t, true, 'image/jpeg');
  expect(mock.upload).toHaveBeenCalledWith('captain/new-avatar.jpg', expect.any(Blob), { contentType: 'image/jpeg', upsert: false });
  expect(mock.save).toHaveBeenCalledWith({ ...input, avatar_path: 'captain/new-avatar.jpg' });
});
