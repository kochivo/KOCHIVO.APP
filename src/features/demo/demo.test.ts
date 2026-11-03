import { beforeEach, expect, it, vi } from 'vitest';
import { startDemo } from './data/start-demo';
import { demoError, demoExpiry, demoHours } from './data/demo-profile';
import { decideRoute } from '@/features/auth';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as ReactModule from 'react';
import { DemoScreen } from './components/demo-screen';
import { Button } from '@/ui';

const hooks = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, toast: vi.fn() }));
vi.mock('react', async original => ({
  ...await original<typeof ReactModule>(),
  useCallback: (callback: unknown) => callback,
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = initial;
    return [hooks.slots[index], (next: unknown) => {
      hooks.slots[index] = typeof next === 'function' ? next(hooks.slots[index]) : next;
    }];
  },
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => createT(messages, 'en'), useLocale: () => 'en' }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ error: hooks.toast }) }));
vi.mock('@/lib/public-config', () => ({ publicConfig: { turnstileSiteKey: 'site-key' } }));
type Node = ReactElement<Record<string, unknown>>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!isValidElement<Record<string, unknown>>(value)) return [];
  return [value, ...nodes(value.props.children)];
}
function render() { hooks.cursor = 0; return nodes(DemoScreen()); }
function button(tree = render()) { return tree.find(node => node.type === Button); }
function widget(tree = render()) { return tree.find(node => node.props.siteKey === 'site-key'); }

it('uses Arabic hour forms and English singular and plural in the banner', () => {
  const ar = createT(messages, 'ar');
  const en = createT(messages, 'en');
  expect(ar('demoExpiry', { n: 2, count: '2' })).toBe('وضع الديمو · بيتمسح بعد ساعتين');
  expect(ar('demoExpiry', { n: 3, count: '3' })).toBe('وضع الديمو · بيتمسح بعد 3 ساعات');
  expect(en('demoExpiry', { n: 1, count: '1' })).toBe('Demo mode · clears in 1 hour');
  expect(en('demoExpiry', { n: 24, count: '24' })).toBe('Demo mode · clears in 24 hours');
});

const mocks = vi.hoisted(() => {
  const single = vi.fn();
  const query = { select: vi.fn(), eq: vi.fn(), single, maybeSingle: vi.fn(), insert: vi.fn() };
  const client = { auth: { signOut: vi.fn(), signInAnonymously: vi.fn(), getUser: vi.fn(), getSession: vi.fn() }, rpc: vi.fn(), from: vi.fn() };
  return { client, query };
});
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/browser', () => ({ supabaseBrowser: () => mocks.client }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => mocks.client }));
beforeEach(() => {
  vi.resetAllMocks();
  hooks.slots = []; hooks.cursor = 0;
  mocks.client.auth.signInAnonymously.mockResolvedValue({ error: null });
  mocks.client.auth.signOut.mockResolvedValue({ error: null });
  mocks.client.auth.getSession.mockResolvedValue({ data: { session: null } });
  mocks.client.rpc.mockResolvedValue({ error: null });
  mocks.client.from.mockReturnValue(mocks.query);
  mocks.query.select.mockReturnValue(mocks.query);
  mocks.query.eq.mockReturnValue(mocks.query);
  mocks.query.maybeSingle.mockResolvedValue({ data: { demo_expires_at: null }, error: null });
});
it('replaces an expired demo before calling the idempotent workspace RPC', async () => {
  mocks.client.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'old', is_anonymous: true } } } });
  mocks.query.maybeSingle.mockResolvedValue({ data: { demo_expires_at: '2026-11-02T12:00:00Z' }, error: null });
  expect(await startDemo(vi.fn(), 'fresh', 'en', () => Date.parse('2026-11-03T12:00:00Z'))).toBeUndefined();
  expect(mocks.client.auth.signOut).toHaveBeenCalledOnce();
  expect(mocks.client.auth.signInAnonymously).toHaveBeenCalledExactlyOnceWith({ options: { captchaToken: 'fresh' } });
  expect(mocks.client.rpc).toHaveBeenCalledOnce();
});
it.each(['returned', 'thrown', 'navigation'])('shows %s failures and accepts a fresh verification for the next click', async mode => {
  const assign = vi.fn(() => { throw new Error('navigation failed'); });
  vi.stubGlobal('window', { location: { assign } });
  try {
    (widget()?.props.onToken as (token: string) => void)('used');
    const oldKey = widget()?.key;
    if (mode === 'returned') mocks.client.rpc.mockResolvedValueOnce({ error: { message: 'offline' } });
    if (mode === 'thrown') mocks.client.auth.getSession.mockRejectedValueOnce(new Error('offline'));
    const request = (button()?.props.onClick as () => Promise<void>)();
    expect(button()?.props.disabled).toBe(true);
    await request;
    const tree = render();
    expect(tree.some(node => node.props.role === 'alert')).toBe(true);
    expect(hooks.toast).toHaveBeenCalledWith('The demo is unavailable right now');
    expect(tree.some(node => node.props.role === 'status')).toBe(false);
    expect(widget(tree)?.key).not.toBe(oldKey);
    expect(button(tree)?.props.disabled).toBe(true);
    (widget(tree)?.props.onToken as (token: string) => void)('fresh');
    expect(button()?.props.disabled).toBe(false);
    await (button()?.props.onClick as () => Promise<void>)();
    expect(mocks.client.auth.signInAnonymously).toHaveBeenLastCalledWith({ options: { captchaToken: 'fresh' } });
  } finally { vi.unstubAllGlobals(); }
});
it('recovers a missing workspace on a later click with a fresh captcha token', async () => {
  mocks.client.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'old', is_anonymous: true } } } });
  mocks.client.rpc.mockResolvedValueOnce({ error: { message: 'offline' } })
    .mockResolvedValueOnce({ error: { message: 'profile required', code: '42501' } });
  const navigate = vi.fn();
  expect(await startDemo(navigate, 'first')).toBe('الديمو مش متاح دلوقتي');
  expect(mocks.client.auth.signInAnonymously).not.toHaveBeenCalled();
  expect(await startDemo(navigate, 'fresh')).toBeUndefined();
  expect(mocks.client.auth.signOut).toHaveBeenCalledOnce();
  expect(mocks.client.auth.signInAnonymously).toHaveBeenCalledExactlyOnceWith({ options: { captchaToken: 'fresh' } });
  expect(navigate).toHaveBeenCalledExactlyOnceWith('/captain');
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
  mocks.client.rpc.mockResolvedValueOnce({ error: { message: 'network failure' } });
  const navigate = vi.fn();
  expect(await startDemo(navigate)).toBe('الديمو مش متاح دلوقتي');
  expect(await startDemo(navigate)).toBeUndefined();
  expect(mocks.client.auth.signOut).not.toHaveBeenCalled();
  expect(mocks.client.auth.signInAnonymously).not.toHaveBeenCalled();
  expect(navigate).toHaveBeenCalledWith('/captain');
});
it.each(['missing-profile', 'non-anonymous', 'broken-auth', 'expired-auth'])('replaces a %s session', async mode => {
  mocks.client.auth.getSession.mockResolvedValue({
    data: { session: { user: { id: 'old', is_anonymous: mode !== 'non-anonymous' } } },
    error: mode === 'expired-auth' ? { code: 'session_expired' } : mode === 'broken-auth' ? { code: 'refresh_token_not_found' } : null,
  });
  if (mode === 'missing-profile') mocks.query.maybeSingle.mockResolvedValue({ data: null, error: null });
  expect(await startDemo(vi.fn(), 'fresh')).toBeUndefined();
  expect(mocks.client.auth.signOut).toHaveBeenCalledOnce();
  expect(mocks.client.auth.signInAnonymously).toHaveBeenCalledExactlyOnceWith({ options: { captchaToken: 'fresh' } });
});
it.each(['getSession', 'profile', 'signOut', 'signIn', 'replacement-workspace'])('returns a translated error on %s failure', async step => {
  mocks.client.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'old', is_anonymous: false } } } });
  if (step === 'getSession') mocks.client.auth.getSession.mockResolvedValue({ data: { session: null }, error: { message: 'offline' } });
  if (step === 'profile') {
    mocks.client.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'old', is_anonymous: true } } } });
    mocks.query.maybeSingle.mockRejectedValue(new Error('offline'));
  }
  if (step === 'signOut') mocks.client.auth.signOut.mockResolvedValue({ error: { message: 'offline' } });
  if (step === 'signIn') mocks.client.auth.signInAnonymously.mockRejectedValue(new Error('offline'));
  if (step === 'replacement-workspace') mocks.client.rpc.mockResolvedValue({ error: { message: 'workspace expired' } });
  const navigate = vi.fn();
  expect(await startDemo(navigate, 'fresh', 'en')).toBe('The demo is unavailable right now');
  expect(navigate).not.toHaveBeenCalled();
  expect(mocks.client.auth.signInAnonymously.mock.calls.length).toBeLessThanOrEqual(1);
});
it('does not reuse a consumed captcha after a newly created account has a workspace failure', async () => {
  mocks.client.rpc.mockResolvedValue({ error: { message: 'workspace missing' } });
  expect(await startDemo(vi.fn(), 'single-use', 'en')).toBe('The demo is unavailable right now');
  expect(mocks.client.auth.signInAnonymously).toHaveBeenCalledOnce();
  expect(mocks.client.auth.signOut).not.toHaveBeenCalled();
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
