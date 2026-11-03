import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authClient, profile } from './auth-client';
import { authError } from '../errors';
import { parseInviteCode } from '../invite-code';

export async function handleAuthCallback(request: NextRequest) {
  const jar = await cookies();
  const raw = jar.get('auth-intent')?.value;
  jar.delete('auth-intent');
  let intent: 'captain' | 'player' | undefined;
  let invite: string | null = null;
  try {
    if (raw) {
      const value: unknown = JSON.parse(raw);
      if (value && typeof value === 'object' && 'intent' in value) {
        if (value.intent === 'captain' || value.intent === 'player') intent = value.intent;
        if ('code' in value && typeof value.code === 'string') invite = parseInviteCode(value.code);
      }
    }
    const code = request.nextUrl.searchParams.get('code');
    if (!code) throw new Error('Missing authorization code');
    const client = await authClient();
    const exchange = await client.auth.exchangeCodeForSession(code);
    if (exchange.error) throw exchange.error;
    const user = await profile(client);
    if (!user) throw new Error('Missing profile');
    if (!user.roleConfirmed) {
      if (!intent) return NextResponse.redirect(new URL('/login', request.url));
      const confirmation = await client.rpc('confirm_role', { p_role: intent });
      if (confirmation.error) throw confirmation.error;
      user.role = intent;
    }
    if (invite) {
      if (user.role === 'captain') return NextResponse.redirect(new URL(`/i/${invite}`, request.url));
      const redemption = await client.rpc('redeem_invite', { p_code: invite });
      if (redemption.error) throw redemption.error;
    }
    return NextResponse.redirect(new URL(user.role === 'captain' ? '/captain' : '/player', request.url));
  } catch (error) {
    const target = new URL(invite ? `/i/${invite}` : '/login', request.url);
    target.searchParams.set('error', authError(error));
    return NextResponse.redirect(target);
  }
}
