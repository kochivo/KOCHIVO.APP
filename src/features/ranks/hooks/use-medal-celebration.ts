'use client';

import { useEffect, useRef, useState } from 'react';
import { acknowledgeCelebration, pendingCelebrations } from '../level-up';
import type { Celebration } from '../level-up';
import type { MedalCounts } from '../medals';

export function useMedalCelebration(playerId?: string, lifetime?: number, counts?: MedalCounts) {
  const [queue, setQueue] = useState<Celebration[]>([]);
  const owner = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!playerId || lifetime === undefined) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const incoming = pendingCelebrations(localStorage, playerId, lifetime, counts);
        const retain = owner.current === playerId;
        owner.current = playerId;
        setQueue(current => retain && current[0]
          ? [current[0], ...incoming.filter(item => item.id !== current[0]?.id)] : incoming);
      }
      catch { /* Viewing ranks remains available when storage is disabled. */ }
    });
    return () => { active = false; };
  }, [playerId, lifetime, counts]);
  const first = queue[0];
  useEffect(() => {
    if (!first || !playerId || owner.current !== playerId) return;
    try { acknowledgeCelebration(localStorage, playerId, first); }
    catch { /* Viewing the celebration still works without persistent storage. */ }
  }, [first, playerId]);
  const dismiss = () => {
    const first = queue[0];
    if (first && playerId) {
      try { acknowledgeCelebration(localStorage, playerId, first); }
      catch { /* Dismissal still works without persistent storage. */ }
    }
    setQueue(previous => previous.slice(1));
  };
  return { celebration: queue[0], dismiss };
}
