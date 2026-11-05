import { beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://demo.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test_key_long_enough');
});

it('does not repeat the bucket when the stored path already includes it', async () => {
  const { exerciseMediaUrl, foodMediaUrl } = await import('./media-url');
  const base = 'https://demo.supabase.co/storage/v1/object/public';
  expect(exerciseMediaUrl('exercise-media/0001-a.gif')).toBe(`${base}/exercise-media/0001-a.gif`);
  expect(exerciseMediaUrl('0001-a.gif')).toBe(`${base}/exercise-media/0001-a.gif`);
  expect(foodMediaUrl('food-media/food_rice-v1.webp')).toBe(`${base}/food-media/food_rice-v1.webp`);
  expect(foodMediaUrl('food_rice-v1.webp')).toBe(`${base}/food-media/food_rice-v1.webp`);
});
