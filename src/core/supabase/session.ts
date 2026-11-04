import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { publicEnv } from '@/core/config/env';
import type { AppDatabase } from '@/types/app-database';

type RouteDecision = (input: {
  path: string; user: { role: 'captain' | 'player'; admin: boolean; roleConfirmed: boolean; suspended: boolean; anonymous?: boolean } | null; coach?: string;
}) => { redirect?: string };

export async function refreshSession(request: NextRequest, decideRoute: RouteDecision): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const env = publicEnv();

  const supabase = createServerClient<AppDatabase>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Must run before anything reads the session, otherwise users get logged out at random.
  const { data, error } = await supabase.auth.getClaims();
  let user: Parameters<RouteDecision>[0]['user'] = null;
  if (!error && data?.claims.sub) {
    const result = await supabase.rpc('my_route_profile');
    const profile = result.data?.[0];
    if (!result.error && profile && (profile.role === 'captain' || profile.role === 'player')) {
      user = { role: profile.role, admin: profile.is_admin === true, roleConfirmed: profile.role_confirmed === true,
        suspended: profile.suspended_at != null, anonymous: data.claims.is_anonymous === true };
    }
    if (!user && data.claims.is_anonymous === true) user = { role: 'player', admin: false, roleConfirmed: false, suspended: false, anonymous: true };
  }
  const decision = decideRoute({ path: request.nextUrl.pathname, user, coach: request.nextUrl.searchParams.get('coach') ?? undefined });
  if (decision.redirect) {
    const target = request.nextUrl.clone();
    target.pathname = decision.redirect;
    target.search = '';
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}
