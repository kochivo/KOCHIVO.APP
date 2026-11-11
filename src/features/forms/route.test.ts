import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND'); } }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: () => { throw new Error('Flag-off must not access data'); } }));
vi.mock('./components/forms-library-entry', () => ({ FormsLibraryEntry: () => null }));
afterEach(() => vi.unstubAllEnvs());

it('returns not found before auth/data access with the flag off, leaving existing navigation unchanged', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  const nav = 'src/features/roster/nav.ts';
  const before = readFileSync(nav, 'utf8');
  const { default: page } = await import('@/app/[locale]/(captain)/captain/library/forms/page');
  await expect(page({ params: Promise.resolve({ locale: 'ar' }) })).rejects.toThrow('NEXT_NOT_FOUND');
  expect(readFileSync(nav, 'utf8')).toBe(before);
});
