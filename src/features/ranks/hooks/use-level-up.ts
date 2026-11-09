'use client';

import { useEffect, useState } from 'react';
import type { Tier } from '../types';
import { levelUpStorageKey, shouldCelebrate } from '../level-up';

export function useLevelUp(tier?: Tier, playerId?: string) {
  const [celebration, setCelebration] = useState<Tier | null>(null);
  useEffect(() => {
    if (!tier || !playerId) return;
    const storageKey = levelUpStorageKey(playerId);
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        if (shouldCelebrate(localStorage.getItem(storageKey), tier)) setCelebration(tier);
        localStorage.setItem(storageKey, tier);
      } catch { /* Rank viewing remains available when storage is disabled. */ }
    });
    return () => { cancelled = true; };
  }, [tier, playerId]);
  return { celebration, dismiss: () => setCelebration(null) };
}
