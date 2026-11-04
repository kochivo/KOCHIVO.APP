'use client';

import { useEffect, useState } from 'react';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';

export function useSupplementPlayer(onError: () => void) {
  const [playerId, setPlayerId] = useState<string>();
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void loadSupabaseBrowser().then(async client => {
      if (!active) return;
      const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
        if (active) setPlayerId(session?.user.id);
      });
      unsubscribe = () => listener.subscription.unsubscribe();
      const { data, error } = await client.auth.getSession();
      if (active) {
        if (error) onError();
        setPlayerId(data.session?.user.id);
      }
    }).catch(() => { if (active) onError(); });
    return () => { active = false; unsubscribe?.(); };
  }, [onError]);
  return playerId;
}
