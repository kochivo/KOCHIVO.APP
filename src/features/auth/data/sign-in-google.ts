'use server';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { cookies } from 'next/headers';
import { coachSlug } from '@/lib/coach-slug';
import { parseInviteCode } from '../invite-code';
import { authClient, runAction, siteOrigin } from './auth-client';
import { packageSelection } from '../package-selection';

export async function signInGoogle(intent: 'captain' | 'player', invite?: string, rawCoach?: string, selected?: unknown) {
  const t = await getT(messages);
  return runAction(async () => {
    if (!['captain', 'player'].includes(intent)) return { error: t('chooseAnAccountType') };
    const code = invite ? parseInviteCode(invite) : null;
    const coach = coachSlug(rawCoach);
    if (intent === 'player' && !code && !coach) return { error: t('inviteIsInvalidOrExpired') };
    const client = await authClient();
    const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: {
      redirectTo: `${await siteOrigin()}/auth/callback`, skipBrowserRedirect: true,
    } });
    if (error) throw error;
    (await cookies()).set('auth-intent', JSON.stringify({ intent, code, ...(coach ? { coach, ...packageSelection(selected) } : {}) }), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600,
    });
    return { redirect: data.url };
  });
}
