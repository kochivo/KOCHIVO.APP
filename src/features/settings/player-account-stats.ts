import type { ProgramSnapshot } from '@/core/offline';
import { daysBetween, localDate, weeklyWeekday } from '@/lib/dates';

export type AccountSession = { id: string; training_date: string; completed_at: string | null; client_updated_at: string };

export function accountStats({ remote, local, today, snapshot }: {
  remote: readonly AccountSession[]; local: readonly AccountSession[]; today: string; snapshot?: ProgramSnapshot | null;
}) {
  const sessions = new Map(remote.map(row => [row.id, row]));
  for (const row of local) {
    const saved = sessions.get(row.id);
    if (!saved || row.client_updated_at >= saved.client_updated_at) sessions.set(row.id, row);
  }
  const completed = [...sessions.values()].filter(row => row.completed_at && row.training_date <= today);
  const dates = new Set(completed.map(row => row.training_date));
  const first = [...dates].sort()[0];
  let streak = 0;
  if (first) for (let offset = 0; offset <= Math.min(119, daysBetween(first, today)); offset++) {
    const at = new Date(`${today}T12:00:00Z`);
    at.setUTCDate(at.getUTCDate() - offset);
    const date = localDate(at, 'UTC');
    if (dates.has(date)) { streak++; continue; }
    if (offset === 0) continue;
    const weekly = snapshot?.days.some(day => day.weekday != null);
    const training = snapshot && weekly ? Boolean(snapshot.days.find(day => day.weekday === weeklyWeekday(date) && !day.is_rest_day))
      : !snapshot?.training_days.length || snapshot.training_days.includes(at.getUTCDay());
    if (training) break;
  }
  return { total: completed.length, streak };
}
