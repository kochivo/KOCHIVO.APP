import { afterEach, expect, it, vi } from 'vitest';
import { foodPhotoUrl } from '@/core/storage/media-url';
import { compressImage } from '@/lib/compress-image';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('routes custom photos and both legacy catalog path formats', () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://demo.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test_key_long_enough');
  expect(foodPhotoUrl('captain-food-photos/captain/a.jpg')).toBe('https://demo.supabase.co/storage/v1/object/public/captain-food-photos/captain/a.jpg');
  expect(foodPhotoUrl('food-media/rice.webp')).toBe('https://demo.supabase.co/storage/v1/object/public/food-media/rice.webp');
  expect(foodPhotoUrl('rice.webp')).toBe('https://demo.supabase.co/storage/v1/object/public/food-media/rice.webp');
});
it('requires compression for food photos when canvas is unavailable', async () => {
  vi.stubGlobal('createImageBitmap', undefined);
  const file = new File(['jpeg'], 'a.jpg', { type: 'image/jpeg' });
  await expect(compressImage(file, 800, 0.8, createT(messages, 'en'), true)).rejects.toThrow('Unsupported image');
});
