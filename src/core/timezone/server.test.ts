import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DEFAULT_TIMEZONE } from '@/lib/dates';
import { getTimezone } from './server';

const state = vi.hoisted(() => ({ timezone: 'Asia/Dubai', failed: false, signedIn: true }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getClaims: async () => ({ data: { claims: { sub: state.signedIn ? 'self' : undefined } } }) },
  from: () => ({ select: () => ({ eq: () => ({ single: async () => ({
    error: state.failed ? new Error('offline') : null,
    data: { id: 'self', timezone: state.timezone, timezone_auto: true },
  }) }) }) }),
}) }));
beforeEach(() => { state.timezone = 'Asia/Dubai'; state.failed = false; state.signedIn = true; });
afterEach(() => vi.unstubAllEnvs());
it('returns Cairo with the flag off and the signed-in zone with it on', async () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '0');
  expect(await getTimezone()).toBe(DEFAULT_TIMEZONE);
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  expect(await getTimezone()).toBe('Asia/Dubai');
});
it('falls back for invalid profiles, failed queries and missing auth', async () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  state.timezone = 'unknown/place';
  expect(await getTimezone()).toBe(DEFAULT_TIMEZONE);
  state.failed = true;
  expect(await getTimezone()).toBe(DEFAULT_TIMEZONE);
  state.signedIn = false;
  expect(await getTimezone()).toBe(DEFAULT_TIMEZONE);
});
