import type { InboxItem } from '@/features/inbox';
import type { RosterPlayer } from '@/features/roster';
import { daysBetween, localDate } from '@/lib/dates';
import { endingSoon, ENDING_SOON_DAYS } from '@/lib/ending-soon';
import type { QueueItem } from './model';

export type TaskKind = 'video' | 'absent' | 'checkin' | 'swap' | 'renew' | 'program' | 'nutrition' | 'receipt';
export type TaskFilter = 'all' | TaskKind;
export type SwapTask = { id: string; player_id: string; created_at: string; from: string; to: string };
export type CaptainTask = { id: string; kind: TaskKind; playerId: string; name: string; at: string;
  avatar?: string | null; text?: string | null; href?: string; timezone?: string; days?: number; neverTrained?: boolean; item?: InboxItem; swap?: SwapTask };
const priority: TaskKind[] = ['video', 'receipt', 'absent', 'checkin', 'swap', 'renew', 'program', 'nutrition'];
export const taskTabs: TaskFilter[] = ['all', 'video', 'checkin', 'receipt', 'absent', 'swap', 'renew', 'program', 'nutrition'];
type ReceiptTask = { id: string; player_id: string; created_at: string };

export function buildTasks(items: QueueItem[], players: RosterPlayer[], swaps: SwapTask[], now: Date, timezone: string, receipts: ReceiptTask[] = [], nutritionPlayers?: ReadonlySet<string>): CaptainTask[] {
  const roster = new Map(players.map(player => [player.playerId, player]));
  const tasks = items.flatMap<CaptainTask>(item => {
    if (item.kind === 'request' && !item.reviewed_at) return [{ id: `request:${item.id}`, kind: 'checkin',
      playerId: item.player_id, name: item.player_name, at: item.created_at, text: item.title,
      avatar: roster.get(item.player_id)?.avatarUrl,
      href: `/captain/players/${item.player_id}/assessments?requestId=${item.id}#assessment-details` }];
    if (item.reviewed_at || (item.kind !== 'form' && item.kind !== 'checkin')) return [];
    const kind = item.kind === 'form' ? 'video' : 'checkin';
    return [{ id: `${kind}:${item.id}`, kind, playerId: item.player_id, name: item.player_name,
      at: item.created_at, avatar: roster.get(item.player_id)?.avatarUrl, item,
      text: item.kind === 'form' ? [item.exercise_name, item.note].filter(Boolean).join(': ') : item.notes }];
  });
  for (const player of players) {
    const today = localDate(now, player.timezone ?? timezone);
    if (player.pending || player.frozenAt) continue;
    const base = { playerId: player.playerId, name: player.fullName, avatar: player.avatarUrl, timezone: player.timezone };
    const captainToday = localDate(now, timezone);
    if (endingSoon(captainToday, player.accessUntil)) tasks.push({ ...base, timezone,
      id: `renew:${player.playerId}`, kind: 'renew', at: player.accessUntil, days: daysBetween(captainToday, player.accessUntil) });
    if (player.accessUntil < today) continue;
    const last = player.lastTrainingDate ?? player.startedOn;
    const days = daysBetween(last, today);
    if (days >= 5) tasks.push({ ...base, id: `absent:${player.playerId}`, kind: 'absent', at: last, days, neverTrained: !player.lastTrainingDate });
    if (!player.programTitle) tasks.push({ ...base, id: `program:${player.playerId}`, kind: 'program', at: player.startedOn });
    if (nutritionPlayers && !nutritionPlayers.has(player.playerId)) tasks.push({ ...base,
      id: `nutrition:${player.playerId}`, kind: 'nutrition', at: player.startedOn,
      href: `/captain/players/${player.playerId}/nutrition` });
  }
  for (const swap of swaps) {
    const player = roster.get(swap.player_id);
    if (player) tasks.push({ id: `swap:${swap.id}`, kind: 'swap', playerId: player.playerId, name: player.fullName,
      at: swap.created_at, avatar: player.avatarUrl, swap });
  }
  for (const receipt of receipts) {
    const player = roster.get(receipt.player_id);
    if (player) tasks.push({ id: `receipt:${receipt.id}`, kind: 'receipt', playerId: player.playerId,
      name: player.fullName, avatar: player.avatarUrl, at: receipt.created_at });
  }
  return tasks.sort((a, b) => priority.indexOf(a.kind) - priority.indexOf(b.kind)
    || Date.parse(a.at) - Date.parse(b.at) || a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
}
export function contactedTasks(tasks: CaptainTask[], contacts: Record<string, string>, timezone: string) {
  return tasks.filter(task => {
    if (task.kind !== 'absent' && task.kind !== 'renew') return true;
    const contact = contacts[task.playerId];
    if (!contact) return true;
    const days = daysBetween(task.at, localDate(new Date(contact), task.timezone ?? timezone));
    return task.kind === 'absent' ? days < 5 : days < -ENDING_SOON_DAYS;
  });
}
export const filterTasks = (tasks: CaptainTask[], filter: TaskFilter) => tasks.filter(task => filter === 'all' || task.kind === filter);
export function taskCounts(tasks: CaptainTask[]): Record<TaskFilter, number> {
  const counts = { all: tasks.length, video: 0, absent: 0, checkin: 0, swap: 0, renew: 0, program: 0, nutrition: 0, receipt: 0 };
  for (const task of tasks) counts[task.kind]++;
  return counts;
}
