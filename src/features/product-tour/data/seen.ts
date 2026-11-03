'use server';

import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';

export async function markTourSeen(): Promise<void> {
  try {
    const client = await supabaseServer();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw new Error('Tour session unavailable');
    const result = await client.from('profiles').update({ tour_seen_at: new Date().toISOString() })
      .eq('id', data.user.id).is('tour_seen_at', null);
    if (result.error) throw result.error;
  } catch (error) {
    unstable_rethrow(error);
    console.warn('Could not save tour state', error);
  }
}
