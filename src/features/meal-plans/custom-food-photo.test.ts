import { beforeEach, expect, it, vi } from 'vitest';
import { saveCustomFood } from './data/custom-food-photo';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
const mocks = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn(), create: vi.fn(), update: vi.fn(), compress: vi.fn() }));
vi.mock('./data/custom-food', () => ({ createCustomFood: mocks.create, updateCustomFood: mocks.update }));
vi.mock('@/lib/compress-image', () => ({ compressImage: mocks.compress }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'captain' } }, error: null }) },
  storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
}) }));
const input = { name: 'Soup', servingGrams: 100, kcal: 100, protein: 5, carbs: 10, fat: 2 };
const t = createT(messages, 'en');
const file = new File(['photo'], 'photo.png', { type: 'image/png' });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.compress.mockResolvedValue(new Blob(['jpeg'], { type: 'image/jpeg' }));
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
});
it('removes the uploaded object when the food insert fails', async () => {
  mocks.create.mockRejectedValue(new Error('insert failed'));
  await expect(saveCustomFood(input, file, t)).rejects.toThrow();
  const path = mocks.upload.mock.calls[0]?.[0];
  expect(path).toMatch(/^captain\/[\da-f-]+\.jpg$/);
  expect(mocks.remove).toHaveBeenCalledWith([path]);
});
it('saves without a photo and does not upload', async () => {
  mocks.create.mockResolvedValue({ id: 'food' });
  await expect(saveCustomFood(input, null, t)).resolves.toEqual({ id: 'food' });
  expect(mocks.upload).not.toHaveBeenCalled();
});
it('does not insert after an upload error', async () => {
  mocks.upload.mockResolvedValue({ error: { message: 'failed' } });
  await expect(saveCustomFood(input, file, t)).rejects.toThrow();
  expect(mocks.create).not.toHaveBeenCalled();
});
it('stores the bucket-prefixed path and retains the successful upload', async () => {
  mocks.create.mockResolvedValue({ id: 'food' });
  await saveCustomFood(input, file, t);
  const key = mocks.upload.mock.calls[0]?.[0];
  expect(mocks.create).toHaveBeenCalledWith({ ...input, photoPath: `captain-food-photos/${key}` });
  expect(mocks.remove).not.toHaveBeenCalled();
  expect(mocks.compress).toHaveBeenCalledWith(file, 800, 0.8, t, true);
});
it('reports cleanup failure so the form can keep its values for retry', async () => {
  mocks.create.mockRejectedValue(new Error('insert failed'));
  mocks.remove.mockResolvedValue({ error: { message: 'delete failed' } });
  await expect(saveCustomFood(input, file, t)).rejects.toThrow(t('photoCleanupFailed'));
});
it('cleans a replacement upload when an edit fails', async () => {
  mocks.update.mockRejectedValue(new Error('update failed'));
  await expect(saveCustomFood(input, file, t, 'food')).rejects.toThrow('update failed');
  expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0]?.[0]]);
});
