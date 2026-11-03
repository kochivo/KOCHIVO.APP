import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import 'server-only';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { rosterClient } from './client';

export async function archivePlayerAt(playerId: unknown, now: Date): Promise<{ success: true } | { error: string }> {
  const t = await getT(messages);
  const parsed = z.uuid().safeParse(playerId);
  if (!parsed.success) return { error: t('playerNotFound') };
  try {
    const client = await rosterClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return { error: t('signInFirst') };
    const result = await client.from('coach_clients').update({ archived_at: now.toISOString() })
      .eq('captain_id', data.user.id).eq('player_id', parsed.data).is('archived_at', null).select('player_id');
    if (result.error || result.data?.length !== 1) return { error: t('couldntArchiveTryAgain') };
    revalidatePath('/captain');
    return { success: true };
  } catch { return { error: t('couldntArchiveTryAgain') }; }
}
