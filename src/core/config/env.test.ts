import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

it('does not import the Zod runtime for public environment validation', () => {
  const source = readFileSync(new URL('./env.ts', import.meta.url), 'utf8');
  expect(source).not.toMatch(/import\s+(?!type\b).*from\s+['"]zod/);
});

it.each([
  [undefined, undefined], ['', ''], ['invalid', 'short'],
  ['https://', 'x'.repeat(20)], ['https://example.com', undefined],
  ['https://example.com', 'x'.repeat(19)],
  [' https://example.com/path ', 'x'.repeat(20)],
  ['https://exa\nmple.com', 'x'.repeat(20)],
  ['mailto:coach@example.com', 'x'.repeat(20)],
])('preserves validation results and error details for %s / %s', async (url, key) => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', key);
  const { publicEnv } = await import('./env');
  const expected = schema.safeParse({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key });
  if (expected.success) expect(publicEnv()).toEqual(expected.data);
  else {
    expect(publicEnv).toThrowError(expected.error.message);
    try { publicEnv(); } catch (error) {
      expect(error).toMatchObject({ name: expected.error.name, issues: expected.error.issues });
    }
  }
});

it('reads lazily, retries failed validation, and caches only a valid result', async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', undefined);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', undefined);
  const { publicEnv } = await import('./env');
  expect(publicEnv).toThrow();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.com');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'x'.repeat(20));
  const first = publicEnv();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'invalid');
  expect(publicEnv()).toBe(first);
});
