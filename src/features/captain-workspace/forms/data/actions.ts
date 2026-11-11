'use server';
import { getPlayerTimezone } from '@/core/timezone/server';

import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { getT } from '@/core/i18n/server';
import { supabaseServer } from '@/core/supabase/server';
import { localDate } from '@/lib/dates';
import { messages } from '../messages';
import { loadForms } from './load-forms';

export async function listPlayerForms(playerId: string) {
  const t = await getT(messages);
  if (!z.uuid().safeParse(playerId).success) return { error: t('error') };
  try {
    const client = await supabaseServer();
    const auth = await client.auth.getClaims();
    if (auth.error || !auth.data?.claims.sub) return { error: t('error') };
    return { data: await loadForms(client, playerId, localDate(new Date(), await getPlayerTimezone(playerId))) };
  } catch (error) { unstable_rethrow(error); return { error: t('error') }; }
}
