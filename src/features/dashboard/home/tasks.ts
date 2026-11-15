import type { RosterPlayer } from '@/features/roster';
import { localDate, saturdayWeek } from '@/lib/dates';
import type { CaptainTask } from '@/features/captain-workspace';

export type HomeTask = {
  id: string; playerId: string; name: string; href: string;
  kind: 'checkin' | 'form' | 'assessment' | 'absent' | 'noProgram' | 'renew' | 'dues' | 'swap' | 'receipt';
  title?: string; days?: number; urgent: boolean;
};
export const taskEstimate = (count: number) => count * 3;
export const taskProgress = (completed: number, pending: number) => completed + pending ? completed / (completed + pending) : 1;

export function buildHomeTasks(tasks: CaptainTask[]): HomeTask[] {
  return tasks.map(task => ({ id: task.id, playerId: task.playerId, name: task.name,
    kind: task.href ? 'assessment' : task.kind === 'video' ? 'form' : task.kind === 'program' ? 'noProgram' : task.kind,
    href: task.href ?? (task.kind === 'receipt' ? `/captain/billing#receipt-${task.id.slice('receipt:'.length)}` : '/captain/tasks'),
    urgent: task.kind === 'video' || task.kind === 'receipt' || (task.kind === 'absent' && (task.days ?? 0) >= 7),
    days: task.days, title: task.text ?? undefined }));
}

export function weekChart(sessions: { date: string }[], today: string) {
  return saturdayWeek(today).map(date => ({ date, count: sessions.filter(session => session.date === date).length, passed: date < today }));
}

export function trainingToday(players: RosterPlayer[], sessions: { playerId: string; date: string }[], now: Date, timezone: string) {
  const active = players.filter(player => !player.pending && !player.frozenAt
    && player.accessUntil >= localDate(now, player.timezone ?? timezone));
  const trained = active.filter(player => sessions.some(session => session.playerId === player.playerId
    && session.date === localDate(now, player.timezone ?? timezone))).length;
  return { trained, active: active.length };
}
