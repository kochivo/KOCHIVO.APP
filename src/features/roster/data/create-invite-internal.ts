import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import 'server-only';

import { localDate } from '@/lib/dates';
import { uuidv7 } from '@/core/offline/ids';
import { inviteDaysSchema } from '../invite';
import { rosterClient } from './client';
import { demoExpiry } from '@/features/demo';

export async function createInviteAt(days: unknown, now: Date): Promise<{ code: string } | { error: string }> {
  const t = await getT(messages);
  const parsed = inviteDaysSchema.safeParse(days);
  if (!parsed.success) return { error: t('choose730Or90Days') };
  try {
    const client = await rosterClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return { error: t('signInFirst') };
    const profile = await client.from('profiles').select('*').eq('id', data.user.id).single();
    if (profile.error || profile.data.role !== 'captain') return { error: t('onlyCoachesCanSendInvites') };
    if (demoExpiry(profile.data)) return { error: t('invitesAreDisabledInTheDemo') };
    const today = localDate(now);
    const end = new Date(`${today}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + parsed.data);
    const result = await client.from('coach_invites').insert({
      id: uuidv7(), captain_id: data.user.id, access_until: localDate(end, 'UTC'),
    }).select('code').single();
    if (result.error) {
      if (result.error.code === '42501') {
        const current = await client.from('profiles').select('suspended_at').eq('id', data.user.id).single();
        if (current.data?.suspended_at) return { error: t('yourAccountIsSuspendedContactSupport') };
      }
      return { error: t('couldntCreateTheInviteTryAgain') };
    }
    return { code: result.data.code };
  } catch { return { error: t('couldntCreateTheInviteTryAgain') }; }
}
