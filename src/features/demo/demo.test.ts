import { beforeEach, expect, it, vi } from 'vitest';
import { startDemo } from './data/start-demo';
import { demoError, demoExpiry, demoHours } from './data/demo-profile';
import { decideRoute } from '@/features/auth';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';

it('uses Arabic hour forms and English singular and plural in the banner', () => {
  const ar = createT(messages, 'ar');
  const en = createT(messages, 'en');
  expect(ar('demoExpiry', { n: 2, count: '٢' })).toBe('وضع الديمو · بيتمسح بعد ساعتين');
  expect(ar('demoExpiry', { n: 3, count: '٣' })).toBe('وضع الديمو · بيتمسح بعد ٣ ساعات');
  expect(en('demoExpiry', { n: 1, count: '1' })).toBe('Demo mode · clears in 1 hour');
  expect(en('demoExpiry', { n: 24, count: '24' })).toBe('Demo mode · clears in 24 hours');
});

const mocks = vi.hoisted(() => {
  const single = vi.fn();
  const query = { select: vi.fn(), eq: vi.fn(), single, insert: vi.fn() };
  const client = { auth: { signInAnonymously: vi.fn(), getUser: vi.fn(), getSession: vi.fn() }, rpc: vi.fn(), from: vi.fn() };
  return { client, query };
});
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/browser', () => ({ supabaseBrowser: () => mocks.client }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => mocks.client }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.client.auth.signInAnonymously.mockResolvedValue({ error: null });
  mocks.client.auth.getSession.mockResolvedValue({ data: { session: null } });
  mocks.client.rpc.mockResolvedValue({ error: null });
  mocks.client.from.mockReturnValue(mocks.query);
  mocks.query.select.mockReturnValue(mocks.query);
  mocks.query.eq.mockReturnValue(mocks.query);
});
it('starts the workspace before navigating to captain', async () => {
  const navigate = vi.fn();
  expect(await startDemo(navigate)).toBeUndefined();
  expect(mocks.client.rpc).toHaveBeenCalledWith('create_demo_workspace');
  expect(navigate).toHaveBeenCalledWith('/captain');
  expect(mocks.client.rpc.mock.invocationCallOrder[0] ?? Infinity).toBeLessThan(navigate.mock.invocationCallOrder[0] ?? 0);
});
it('reuses an existing anonymous session on retry', async () => {
  mocks.client.auth.getSession.mockResolvedValue({ data: { session: { user: { is_anonymous: true } } } });
  const navigate = vi.fn();
  expect(await startDemo(navigate)).toBeUndefined();
  expect(mocks.client.auth.signInAnonymously).not.toHaveBeenCalled();
  expect(navigate).toHaveBeenCalledWith('/captain');
});
it('passes captcha only when supplied', async () => {
  await startDemo(vi.fn());
  expect(mocks.client.auth.signInAnonymously).toHaveBeenLastCalledWith();
  await startDemo(vi.fn(), 'token');
  expect(mocks.client.auth.signInAnonymously).toHaveBeenLastCalledWith({ options: { captchaToken: 'token' } });
});
it('maps thrown network failures without navigating', async () => {
  const navigate = vi.fn();
  mocks.client.auth.signInAnonymously.mockRejectedValueOnce(new Error('offline'));
  expect(await startDemo(navigate)).toBe('الديمو مش متاح دلوقتي');
  mocks.client.rpc.mockRejectedValueOnce(new Error('offline'));
  expect(await startDemo(navigate)).toBe('الديمو مش متاح دلوقتي');
  expect(navigate).not.toHaveBeenCalled();
});
it.each([
  [{ message: 'demo_limit' }, 'الديمو زحمة دلوقتي، جرّب بعد شوية'],
  [{ code: 'captcha_failed' }, 'اتأكد إنك مش روبوت وجرّب تاني'],
  [{ message: 'CAPTCHA verification failed' }, 'اتأكد إنك مش روبوت وجرّب تاني'],
  [{ code: 'anonymous_provider_disabled' }, 'الديمو مش متاح دلوقتي'],
  [new Error('offline'), 'الديمو مش متاح دلوقتي'],
])('maps failures at either step', async (error, message) => {
  expect(demoError(error)).toBe(message);
  const navigate = vi.fn();
  mocks.client.auth.signInAnonymously.mockResolvedValueOnce({ error });
  expect(await startDemo(navigate)).toBe(message);
  expect(mocks.client.rpc).not.toHaveBeenCalled();
  mocks.client.rpc.mockResolvedValueOnce({ error });
  expect(await startDemo(navigate)).toBe(message);
  expect(navigate).not.toHaveBeenCalled();
});
it('validates the flag and rounds remaining hours up, clamping expired demos', () => {
  const expiry = '2026-11-04T12:00:00Z';
  expect(demoExpiry({ demo_expires_at: expiry })).toBe(expiry);
  for (const value of [null, {}, { demo_expires_at: 'invalid' }, { demo_expires_at: 42 }]) expect(demoExpiry(value)).toBeNull();
  expect(demoHours(expiry, new Date('2026-11-03T12:00:00Z'))).toBe(24);
  expect(demoHours(expiry, new Date('2026-11-04T11:59:59Z'))).toBe(1);
  expect(demoHours(expiry, new Date('2026-11-05T12:00:00Z'))).toBe(0);
});
it('routes an anonymous session without a workspace to demo', () => {
  for (const path of ['/captain', '/player', '/captain/settings']) {
    expect(decideRoute({ path, user: { role: 'player', roleConfirmed: false, anonymous: true } })).toEqual({ redirect: '/demo' });
  }
});
