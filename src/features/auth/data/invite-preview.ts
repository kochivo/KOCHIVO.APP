'use server';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { parseInviteCode } from '../invite-code';
import { authError } from '../errors';
import { authClient, profile } from './auth-client';

export async function invitePreview(input: string) {
  const t = await getT(messages);
  try {
    const code = parseInviteCode(input);
    if (!code) return { error: t('inviteIsInvalidOrExpired') };
    const client = await authClient();
    const user = await profile(client);
    if (user?.role === 'captain') return { error: t('thisIsACoachAccount') };
    const { data, error } = await client.rpc('invite_preview', { p_code: code });
    if (error) throw error;
    const preview = data?.[0];
    if (!preview?.valid) return { error: t('inviteIsInvalidOrExpired') };
    return { captainName: preview.captain_name ?? '', signedIn: !!user };
  } catch (error) { return { error: authError(error, t) }; }
}
