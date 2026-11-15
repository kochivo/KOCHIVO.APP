'use client';
import { useCallback } from 'react';
import { useResource } from '@/core/resource';
import { loadCycle } from '../data/cycle';

export function useCycle(playerId?: string) {
  const load = useCallback(() => playerId ? loadCycle(playerId) : Promise.reject(new Error('missing player')), [playerId]);
  return useResource(playerId ? `private-cycle:${playerId}` : null, load);
}
