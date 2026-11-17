'use client';

import { useCallback } from 'react';
import { useResource } from '@/core/resource';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';

export function useCoachUnread(playerId: string | undefined, captainId: string | undefined) {
  const load = useCallback(async () => {
    if (!playerId || !captainId) return 0;
    const db = await loadSupabaseBrowser();
    // Match the home chat unread source without mounting a thread, which marks messages read.
    const result = await db.from('chat_messages').select('id', { count: 'exact', head: true })
      .eq('player_id', playerId).eq('captain_id', captainId).neq('sender_id', playerId).is('read_at', null);
    if (result.error) throw result.error;
    return result.count ?? 0;
  }, [playerId, captainId]);
  return useResource(playerId && captainId ? `coach-unread:${playerId}:${captainId}` : null, load, { pollMs: 15000 });
}
