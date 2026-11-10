'use client';

import { useEffect, useState } from 'react';
import type { Tier } from '../types';
import { levelUpStorageKey, shouldCelebrate } from '../level-up';
import { legendStars } from '../tiers';

export function recordLegendStars(storage: Pick<Storage, 'getItem' | 'setItem'>, playerId: string, stars: number): boolean {
  const key = `${levelUpStorageKey(playerId)}:stars`;
  const previous = storage.getItem(key);
  const knownTier = storage.getItem(levelUpStorageKey(playerId));
  const seen = previous === null ? 0 : Number(previous);
  const celebrate = knownTier === 'legend' && Number.isInteger(seen) && seen >= 0 && stars > seen;
  storage.setItem(key, String(Math.max(Number.isFinite(seen) ? seen : 0, stars)));
  return celebrate;
}

export function useLevelUp(tier?: Tier, playerId?: string, lifetime?: number) {
  const [celebration, setCelebration] = useState<Tier | null>(null);
  const [stars, setStars] = useState(0);
  useEffect(() => {
    if (!tier || !playerId) return;
    const storageKey = levelUpStorageKey(playerId);
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const count = lifetime === undefined ? 0 : legendStars(lifetime);
        const newStar = lifetime !== undefined && recordLegendStars(localStorage, playerId, count);
        if (shouldCelebrate(localStorage.getItem(storageKey), tier) || newStar) {
          setCelebration(tier);
          setStars(count);
        }
        localStorage.setItem(storageKey, tier);
      } catch { /* Rank viewing remains available when storage is disabled. */ }
    });
    return () => { cancelled = true; };
  }, [tier, playerId, lifetime]);
  return { celebration, stars, dismiss: () => setCelebration(null) };
}
