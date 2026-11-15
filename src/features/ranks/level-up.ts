import { TIERS } from './tiers';
import type { Tier } from './types';
import { MEDAL_RANKS, medalRank, legendStars } from './tiers';
import type { MedalRank } from './tiers';
import { medalProgress } from './medals';
import type { MedalCounts, MedalMetal } from './medals';

export type Celebration = { id: string; rank: MedalMetal; emblem: 'star' | 'flame' | 'calendar' | 'bolt' | 'crown';
  medal?: MedalRank; stars?: number; labelKey?: 'workoutSet' | 'full_weeks' | 'prs' | 'crowns'; threshold?: number; streak?: boolean };
type Store = Pick<Storage, 'getItem' | 'setItem'>;

export function pendingCelebrations(storage: Store, player: string, lifetime: number, counts?: MedalCounts): Celebration[] {
  const key = `kochivo:last-seen-medal-rank:${player}`;
  const rank = medalRank(lifetime);
  const previous = storage.getItem(key);
  const index = MEDAL_RANKS.findIndex(entry => entry.rank === rank);
  const before = MEDAL_RANKS.findIndex(entry => entry.rank === previous);
  const stars = legendStars(lifetime);
  const starKey = `${key}:stars`;
  const seenStars = Number(storage.getItem(starKey) ?? 0);
  const result: Celebration[] = [];
  if (before < 0) { storage.setItem(key, rank); storage.setItem(starKey, String(stars)); }
  else if (index > before) result.push({ id: `rank:${rank}`, rank: index as MedalMetal, emblem: 'star', medal: rank, stars });
  else if (previous === 'legend' && stars > (Number.isFinite(seenStars) ? seenStars : 0)) {
    result.push({ id: `star:${stars}`, rank: 6, emblem: 'star', medal: 'legend', stars });
  }
  if (counts) for (const set of medalProgress(counts)) for (const step of set.earned) {
    if (storage.getItem(`kochivo:seen-medal:${player}:${step.id}`) !== '1') {
      result.push({ id: step.id, rank: step.metal, emblem: set.emblem,
        labelKey: set.key === 'workouts' ? 'workoutSet' : set.key, threshold: step.threshold, streak: step.streak });
    }
  }
  return result;
}

export function acknowledgeCelebration(storage: Store, player: string, item: Celebration): void {
  if (item.medal) {
    storage.setItem(`kochivo:last-seen-medal-rank:${player}`, item.medal);
    storage.setItem(`kochivo:last-seen-medal-rank:${player}:stars`, String(item.stars ?? 0));
  }
  else storage.setItem(`kochivo:seen-medal:${player}:${item.id}`, '1');
}

export function levelUpStorageKey(playerId: string): string {
  return `kochivo:last-seen-tier:${playerId}`;
}

export function shouldCelebrate(lastSeenTier: string | null, currentTier: Tier): boolean {
  const previous = TIERS.findIndex(entry => entry.tier === lastSeenTier);
  return previous >= 0 && TIERS.findIndex(entry => entry.tier === currentTier) > previous;
}
