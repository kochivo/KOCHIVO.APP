'use server';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { parseInviteCode } from '../invite-code';
import { authClient, profile, runAction } from './auth-client';

export async function redeemInvite(input: string) {
  const t = await getT(messages);
  return runAction(async () => {
    const code = parseInviteCode(input);
    if (!code) return { error: t('inviteIsInvalidOrExpired') };
    const client = await authClient();
    const user = await profile(client);
    if (user?.role === 'captain') return { error: t('thisIsACoachAccount') };
    if (!user) return { error: t('signInFirst') };
    if (!user.roleConfirmed) {
      const confirmation = await client.rpc('confirm_role', { p_role: 'player' });
      if (confirmation.error) throw confirmation.error;
    }
    const { error } = await client.rpc('redeem_invite', { p_code: code });
    if (error) throw error;
    return { redirect: '/player/onboarding' };
  });
}
