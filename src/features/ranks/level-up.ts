import { TIERS } from './tiers';
import type { Tier } from './types';

export function levelUpStorageKey(playerId: string): string {
  return `kochivo:last-seen-tier:${playerId}`;
}

export function shouldCelebrate(lastSeenTier: string | null, currentTier: Tier): boolean {
  const previous = TIERS.findIndex(entry => entry.tier === lastSeenTier);
  return previous >= 0 && TIERS.findIndex(entry => entry.tier === currentTier) > previous;
}
