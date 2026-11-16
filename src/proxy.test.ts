import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { proxy, config } from './proxy';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';

it.each(['/sitemap.xml', '/robots.txt'])('leaves metadata endpoint %s outside the locale proxy', url => {
  expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(false);
});

it.each(['/_vercel/insights/script.js', '/_vercel/insights/view', '/_vercel/insights/event'])('leaves analytics endpoint %s outside the auth/locale proxy', url => {
  expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(false);
});

it.each(['/captain', '/player', '/_vercel/insights-other'])('retains proxy protection for %s', url => {
  expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
});

const session = vi.hoisted(() => ({ refresh: vi.fn(), decide: vi.fn() }));
vi.mock('@/core/supabase/session', () => ({ refreshSession: session.refresh }));
vi.mock('@/features/auth', () => ({ decideRoute: session.decide }));
beforeEach(() => {
  vi.clearAllMocks();
  session.refresh.mockImplementation(async (request: NextRequest) => NextResponse.next({ request }));
});

it.each(['/', '/privacy', '/offline', '/captain'])('persists the detected first-visit locale on %s', async path => {
  const response = await proxy(new NextRequest(`https://kochivo.site${path}`, {
    headers: { 'accept-language': 'en-US,ar;q=0.9', 'x-vercel-ip-country': 'EG' },
  }));
  expect(response.cookies.get('kochivo.locale')).toMatchObject({ value: 'en', maxAge: 31536000, sameSite: 'lax', path: '/' });
  expect(response.headers.get('x-middleware-rewrite')).toBe(`https://kochivo.site/en${path === '/' ? '' : path}`);
});

it('never replaces an existing cookie with detection', async () => {
  const response = await proxy(new NextRequest('https://kochivo.site/', {
    headers: { cookie: 'kochivo.locale=ar', 'accept-language': 'en-US', 'x-vercel-ip-country': 'US' },
  }));
  expect(response.cookies.get('kochivo.locale')).toBeUndefined();
  expect(response.headers.get('x-middleware-rewrite')).toBe('https://kochivo.site/ar');
});

it('lets a shared English link replace a saved Arabic choice', async () => {
  const response = await proxy(new NextRequest('https://kochivo.site/en', { headers: { cookie: 'kochivo.locale=ar' } }));
  expect(response.cookies.get('kochivo.locale')?.value).toBe('en');
});

it('persists detection on an auth redirect', async () => {
  session.refresh.mockResolvedValueOnce(NextResponse.redirect('https://kochivo.site/login'));
  const response = await proxy(new NextRequest('https://kochivo.site/captain', { headers: { 'accept-language': 'en' } }));
  expect(response.cookies.get('kochivo.locale')?.value).toBe('en');
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

it.each(['/offline', '/privacy', '/terms'])('rewrites %s without session work', async path => {
  const response = await proxy(new NextRequest(`https://kochivo.site${path}`, { headers: { cookie: 'kochivo.locale=en' } }));
  expect(response.headers.get('x-middleware-rewrite')).toBe(`https://kochivo.site/en${path}`);
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
  session.refresh.mockImplementationOnce(async (request: NextRequest) => {
    request.cookies.set('session', 'fresh');
    return refreshed;
  });
  const response = await proxy(new NextRequest('https://kochivo.site/captain'));
  expect(response.cookies.get('session')).toMatchObject({ value: 'fresh', httpOnly: true });
  expect(response.headers.get('x-middleware-request-cookie')).toBe('session=fresh');
  expect(response.headers.get('x-middleware-rewrite')).toBe('https://kochivo.site/ar/captain');
  expect(response.headers.has('x-middleware-next')).toBe(false);
});

it('overwrites a forged captain path before forwarding it to the layout', async () => {
  const response = await proxy(new NextRequest('https://kochivo.site/captain/pending', {
    headers: { 'x-kochivo-path': '/captain' },
  }));
  expect(response.headers.get('x-middleware-request-x-kochivo-path')).toBe('/captain/pending');
});
