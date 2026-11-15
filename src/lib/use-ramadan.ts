'use client';
import { useResource } from '@/core/resource';
import { loadPlayerRamadan } from './ramadan-player';
export function useRamadan() {
  return useResource('settings:ramadan:player', loadPlayerRamadan, { pollMs: 60_000 });
}
