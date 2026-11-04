'use client';

import { useEffect, useState } from 'react';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
export type TodayDecision = 'keep' | 'reduce' | 'rest';

const cache = new Map<string, TodayDecision | null>();

export function useTodayDecision(playerId?: string, today = '') {
  const key = `${playerId}:${today}`;
  const [result, setResult] = useState<{ key: string; decision: TodayDecision | null } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      if (!playerId || !today || !navigator.onLine) return;
      try {
        const client = await loadSupabaseBrowser();
        const { data, error } = await client.from('readiness_decisions').select('decision')
          .eq('player_id', playerId).eq('decision_date', today).maybeSingle();
        if (error || cancelled) return;
        cache.set(key, data?.decision ?? null);
        setResult({ key, decision: data?.decision ?? null });
      } catch { /* An optional online decision must not block an offline workout. */ }
    };
    void read();
    window.addEventListener('online', read);
    window.addEventListener('focus', read);
    return () => { cancelled = true; window.removeEventListener('online', read); window.removeEventListener('focus', read); };
  }, [key, playerId, today]);
  return result?.key === key ? result.decision : cache.get(key) ?? null;
}
