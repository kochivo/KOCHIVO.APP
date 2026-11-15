'use server';

import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';
import { getT } from '@/core/i18n/server';
import { messages } from './subscription-messages';

export async function startSubscription(linkId: string): Promise<{ error?: string }> {
  const t = await getT(messages);
  try {
    const client = await supabaseServer();
    const { error } = await client.rpc('start_player_subscription', { p_link: linkId });
    return error ? { error: t('error') } : {};
  } catch (error) { unstable_rethrow(error); return { error: t('error') }; }
}
