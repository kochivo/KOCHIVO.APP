import { checkinSnapshot, mergePlayerFile } from '@/features/player-file';
import type { Snapshot } from '@/features/player-file';
import type { InboxItem } from '@/features/inbox';

export type RenewalItem = { kind: 'renewal'; id: string; player_id: string; player_name: string;
  created_at: string; reviewed_at: null; reply: null; access_until: string };
export type QueueItem = (InboxItem | RenewalItem) & { snapshot?: Snapshot };
export type Change = { key: 'weight' | 'waist' | 'injury' | 'trainingDays' | 'noChange';
  style: 'neutral' | 'warn' | 'danger'; delta?: number };
export function queueRow(item: QueueItem, previousSnapshot: Snapshot | undefined, now: Date) {
  const ageHours = Math.max(0, (Date.parse(item.reviewed_at ?? now.toISOString()) - Date.parse(item.created_at)) / 3_600_000);
  const snapshot = item.snapshot ?? (item.kind === 'checkin' ? checkinSnapshot(item) : undefined);
  const facts = snapshot ? mergePlayerFile([...(previousSnapshot ? [previousSnapshot] : []), snapshot], now) : {};
  const changes: Change[] = [];
  if (snapshot && previousSnapshot) {
    const injuries = snapshot.facts.injuries;
    if (injuries?.some(value => value !== 'none' && !previousSnapshot.facts.injuries?.includes(value)))
      changes.push({ key: 'injury', style: 'danger' });
    if (facts.trainingDays?.previous && snapshot.facts.trainingDays !== undefined)
      changes.push({ key: 'trainingDays', style: 'warn' });
    for (const key of ['weight', 'waist'] as const) {
      const fact = facts[key];
      const before = previousSnapshot.facts[key];
      if (snapshot.facts[key] !== undefined && fact && before !== undefined && fact.value !== before)
        changes.push({ key, delta: Math.round((fact.value - before) * 10) / 10, style: 'neutral' });
    }
  }
  if (!changes.length) changes.push({ key: 'noChange', style: 'neutral' });
  return { item, player: { id: item.player_id, name: item.player_name }, kind: item.kind, ageHours,
    late: !item.reviewed_at && ageHours > 24, changes: changes.slice(0, 3), newInjury: changes.some(change => change.key === 'injury') };
}
export type QueueRow = ReturnType<typeof queueRow>;
export function sortQueue(rows: QueueRow[]): QueueRow[] {
  return [...rows].sort((a, b) => Number(b.newInjury && !b.item.reviewed_at) - Number(a.newInjury && !a.item.reviewed_at)
    || Number(b.late) - Number(a.late) || Date.parse(b.item.created_at) - Date.parse(a.item.created_at)
    || a.kind.localeCompare(b.kind) || a.item.id.localeCompare(b.item.id));
}
