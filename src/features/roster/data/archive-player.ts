'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { rosterClient } from './client';

export async function archivePlayer(playerId: unknown): Promise<{ success: true } | { error: string }> {
  const parsed = z.uuid().safeParse(playerId);
  if (!parsed.success) return { error: 'اللاعب مش موجود' };
  try {
    const client = await rosterClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return { error: 'سجّل دخولك الأول' };
    const result = await client.from('coach_clients').update({ archived_at: new Date().toISOString() })
      .eq('captain_id', data.user.id).eq('player_id', parsed.data).is('archived_at', null).select('player_id');
    if (result.error || result.data?.length !== 1) return { error: 'الأرشفة متعملتش. جرّب تاني' };
    revalidatePath('/captain');
    return { success: true };
  } catch { return { error: 'الأرشفة متعملتش. جرّب تاني' }; }
}
