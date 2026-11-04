import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { proxy } from './proxy';

const session = vi.hoisted(() => ({ refresh: vi.fn(), decide: vi.fn() }));
vi.mock('@/core/supabase/session', () => ({ refreshSession: session.refresh }));
vi.mock('@/features/auth', () => ({ decideRoute: session.decide }));
beforeEach(() => {
  vi.clearAllMocks();
  session.refresh.mockImplementation(async (request: NextRequest) => NextResponse.next({ request }));
});

it.each([
  ['/', undefined, '/ar'], ['/demo', 'en', '/en/demo'], ['/x?tab=one', 'invalid', '/ar/x?tab=one'],
])('rewrites %s with cookie %s without changing the public URL', async (path, locale, destination) => {
  const request = new NextRequest(`https://kochivo.site${path}`, { headers: locale ? { cookie: `kochivo.locale=${locale}` } : {} });
  const response = await proxy(request);
  expect(response.headers.get('x-middleware-rewrite')).toBe(`https://kochivo.site${destination}`);
  expect(response.headers.has('location')).toBe(false);
  expect(session.refresh).toHaveBeenCalledWith(request, session.decide);
  expect(request.nextUrl.pathname).toBe(path.split('?')[0]);
});

it.each([['/en/x?tab=one', '/x?tab=one'], ['/ar', '/'], ['/ar/offline', '/offline']])(
  'redirects a directly requested locale prefix %s to its canonical URL', async (path, destination) => {
    const response = await proxy(new NextRequest(`https://kochivo.site${path}`));
    expect(response.headers.get('location')).toBe(`https://kochivo.site${destination}`);
    expect(response.cookies.get('kochivo.locale')?.value).toBe(path.slice(1, 3));
    expect(session.refresh).not.toHaveBeenCalled();
  },
);

it('rewrites offline without session work', async () => {
  const response = await proxy(new NextRequest('https://kochivo.site/offline', { headers: { cookie: 'kochivo.locale=en' } }));
  expect(response.headers.get('x-middleware-rewrite')).toBe('https://kochivo.site/en/offline');
  expect(session.refresh).not.toHaveBeenCalled();
});

it('preserves unprefixed auth redirects and refreshed cookies', async () => {
  const redirect = NextResponse.redirect('https://kochivo.site/login');
  redirect.cookies.set('session', 'fresh', { httpOnly: true, path: '/' });
  session.refresh.mockResolvedValueOnce(redirect);
  expect(await proxy(new NextRequest('https://kochivo.site/captain'))).toBe(redirect);
  const refreshed = NextResponse.next();
  refreshed.cookies.set('session', 'fresh', { httpOnly: true, path: '/' });
  refreshed.headers.set('x-middleware-request-cookie', 'session=fresh');
  refreshed.headers.set('x-middleware-override-headers', 'cookie');
  session.refresh.mockResolvedValueOnce(refreshed);
  const response = await proxy(new NextRequest('https://kochivo.site/captain'));
  expect(response.cookies.get('session')).toMatchObject({ value: 'fresh', httpOnly: true });
  expect(response.headers.get('x-middleware-request-cookie')).toBe('session=fresh');
  expect(response.headers.get('x-middleware-rewrite')).toBe('https://kochivo.site/ar/captain');
  expect(response.headers.has('x-middleware-next')).toBe(false);
});
