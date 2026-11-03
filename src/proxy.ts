import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LOCALE_COOKIE, parseLocale } from '@/core/i18n/locale';
import { refreshSession } from '@/core/supabase/session';
import { decideRoute } from '@/features/auth';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const locale = parseLocale(request.cookies.get(LOCALE_COOKIE)?.value);
  const destination = request.nextUrl.clone();
  if (/^\/(ar|en)(\/|$)/.test(path)) {
    destination.pathname = path.slice(3) || '/';
    return NextResponse.redirect(destination);
  }
  destination.pathname = `/${locale}${path === '/' ? '' : path}`;
  if (path === '/offline') return NextResponse.rewrite(destination);

  const response = await refreshSession(request, decideRoute);
  if (response.headers.has('location')) return response;
  const headers = new Headers(response.headers);
  headers.delete('x-middleware-next');
  const rewritten = NextResponse.rewrite(destination, { headers });
  response.cookies.getAll().forEach(cookie => rewritten.cookies.set(cookie));
  return rewritten;
}

export const config = {
  // Offline still needs a locale rewrite; only assets bypass the proxy entirely.
  matcher: ['/((?!_next/static|_next/image|icons|brand|sw.js|manifest.webmanifest|.*\\.(?:png|gif|webp|svg)$).*)'],
};
