import { getLocale } from '@/core/i18n/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authClient, profile, siteOrigin } from './auth-client';
import { authError } from '../errors';
import { parseInviteCode } from '../invite-code';
import { unstable_rethrow } from 'next/navigation';
import { coachSlug } from '@/lib/coach-slug';
import { completeCoachRequest } from './coach-request';

export async function handleAuthCallback(request: NextRequest) {
  // Behind the host's proxy request.url is the container address (0.0.0.0:8080), not the site.
  const origin = await siteOrigin();
  const jar = await cookies();
  const raw = jar.get('auth-intent')?.value;
  jar.delete('auth-intent');
  let intent: 'captain' | 'player' | undefined;
  let invite: string | null = null;
  let coach = coachSlug(request.nextUrl.searchParams.get('coach'));
  if (coach) intent = 'player';
  try {
    if (raw) {
      const value: unknown = JSON.parse(raw);
      if (value && typeof value === 'object' && 'intent' in value) {
        if (value.intent === 'captain' || value.intent === 'player') intent = value.intent;
        if ('code' in value && typeof value.code === 'string') invite = parseInviteCode(value.code);
        if (!coach && 'coach' in value) coach = coachSlug(value.coach);
      }
    }
    // An explicit coach signup must never redeem an unrelated, stale OAuth invite.
    if (coach) { intent = 'player'; invite = null; }
    const code = request.nextUrl.searchParams.get('code');
    if (!code) throw new Error('Missing authorization code');
    const client = await authClient();
    const exchange = await client.auth.exchangeCodeForSession(code);
    if (exchange.error) throw exchange.error;
    const user = await profile(client);
    if (!user) throw new Error('Missing profile');
    if (!user.roleConfirmed) {
      if (!intent) return NextResponse.redirect(new URL('/login', origin));
      const confirmation = await client.rpc('confirm_role', { p_role: intent });
      if (confirmation.error) throw confirmation.error;
      user.role = intent;
    }
    if (invite) {
      if (user.role === 'captain') return NextResponse.redirect(new URL(`/i/${invite}`, origin));
      const redemption = await client.rpc('redeem_invite', { p_code: invite });
      if (redemption.error) throw redemption.error;
      return NextResponse.redirect(new URL('/player/onboarding', origin));
    }
    if (coach) return NextResponse.redirect(new URL(await completeCoachRequest(client, coach), origin));
    return NextResponse.redirect(new URL(user.role === 'captain' ? '/captain' : '/player', origin));
  } catch (error) {
    unstable_rethrow(error);
    const target = new URL(invite ? `/i/${invite}` : '/login', origin);
    if (coach) { target.searchParams.set('coach', coach); target.searchParams.set('tab', 'signup'); }
    target.searchParams.set('error', authError(error, await getLocale()));
    return NextResponse.redirect(target);
  }
}
