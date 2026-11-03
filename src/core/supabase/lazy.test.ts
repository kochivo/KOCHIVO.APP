import { expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ create: vi.fn(() => ({})) }));
vi.mock('@supabase/ssr', () => ({ createBrowserClient: mocks.create }));
vi.mock('@/core/config/env', () => ({ publicEnv: () => ({
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.com', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-key',
}) }));

it('creates the browser singleton only on demand and shares concurrent requests', async () => {
  const { loadSupabaseBrowser } = await import('./lazy');
  expect(mocks.create).not.toHaveBeenCalled();
  const [first, second] = await Promise.all([loadSupabaseBrowser(), loadSupabaseBrowser()]);
  expect(first).toBe(second);
  expect(await loadSupabaseBrowser()).toBe(first);
  expect(mocks.create).toHaveBeenCalledOnce();
});
