'use client';

import { useEffect, useState } from 'react';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';

// Same source as the food screen: the latest check-in weight, then the intake weight.
export function usePlayerWeight(playerId?: string): number | undefined {
  const [weight, setWeight] = useState<{ playerId: string; value: number | null }>();
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!playerId || !navigator.onLine) return;
      try {
        const client = await loadSupabaseBrowser();
        const [intake, latest] = await Promise.all([
          client.from('player_intake').select('weight_kg').eq('player_id', playerId).maybeSingle(),
          client.from('check_ins').select('body_weight_kg').eq('player_id', playerId).not('body_weight_kg', 'is', null)
            .order('week_start', { ascending: false }).limit(1),
        ]);
        if (cancelled || intake.error || latest.error) return;
        setWeight({ playerId, value: latest.data?.[0]?.body_weight_kg ?? intake.data?.weight_kg ?? null });
      } catch (error) {
        console.warn('Could not load the water goal weight', error);
      }
    }
    void load();
    window.addEventListener('online', load);
    return () => { cancelled = true; window.removeEventListener('online', load); };
  }, [playerId]);
  return weight?.playerId === playerId ? weight?.value ?? undefined : undefined;
}
