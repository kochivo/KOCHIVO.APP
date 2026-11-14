import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { detectLocale } from '@/core/i18n/detect-locale';
import { LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS, parseLocale } from '@/core/i18n/locale';
import { refreshSession } from '@/core/supabase/session';
import { decideRoute } from '@/features/auth';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  request.headers.set('x-kochivo-path', path);
  const saved = request.cookies.get(LOCALE_COOKIE);
  const locale = saved ? parseLocale(saved.value) : detectLocale({
    acceptLanguage: request.headers.get('accept-language'), country: request.headers.get('x-vercel-ip-country'),
  });
  function persistLocale(response: NextResponse) {
    if (!saved) response.cookies.set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTIONS);
    return response;
  }
  const destination = request.nextUrl.clone();
  if (/^\/(ar|en)(\/|$)/.test(path)) {
    destination.pathname = path.slice(3) || '/';
    // A shared /en or /ar link must open in that language, not the visitor's previous one.
    const redirect = NextResponse.redirect(destination);
    redirect.cookies.set(LOCALE_COOKIE, path.slice(1, 3), LOCALE_COOKIE_OPTIONS);
    return redirect;
  }
  destination.pathname = `/${locale}${path === '/' ? '' : path}`;
  if (['/offline', '/privacy', '/terms'].includes(path)) return persistLocale(NextResponse.rewrite(destination));

  const response = await refreshSession(request, decideRoute);
  if (response.headers.has('location')) return persistLocale(response);
  const headers = new Headers(response.headers);
  headers.delete('x-middleware-next');
  const rewritten = NextResponse.rewrite(destination, { headers, request: { headers: request.headers } });
  response.cookies.getAll().forEach(cookie => rewritten.cookies.set(cookie));
  return persistLocale(rewritten);
}

export const config = {
  // Offline still needs a locale rewrite; Vercel insights endpoints are platform-owned.
  matcher: ['/((?!_vercel/insights(?:/|$)|_next/static|_next/image|icons|brand|sw.js|manifest.webmanifest|.*\\.(?:png|gif|webp|svg)$).*)'],
};
