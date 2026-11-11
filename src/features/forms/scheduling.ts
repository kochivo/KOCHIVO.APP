import { localDate } from '@/lib/dates';
import type { Schedule } from './types';

type ScheduledForm = { id: string; captain_id: string; schedule: Schedule | null; archived_at: string | null };
type Link = { captain_id: string; player_id: string; archived_at: string | null; frozen_at: string | null; pending: boolean; access_until: string; sessions_left?: number | null };
type Sent = { form_id: string; player_id: string; sent_at: string; answered_at: string | null };
export function dueRequests(forms: readonly ScheduledForm[], links: readonly Link[], lastSent: readonly Sent[], now: Date) {
  const today = localDate(now);
  const date = new Date(`${today}T12:00:00Z`);
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', hourCycle: 'h23' }).format(now));
  return forms.flatMap(form => {
    const s = form.schedule;
    if (!s || form.archived_at || hour < s.hour) return [];
    const day = date.getUTCDate(), weekday = date.getUTCDay();
    const monthDays = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    if (s.every === 'week' ? weekday !== s.weekday : day !== Math.min(s.day, monthDays)) return [];
    const period = new Date(date);
    if (s.every === 'week') period.setUTCDate(day - ((weekday + 6) % 7));
    else period.setUTCDate(1);
    const start = localDate(period, 'UTC');
    return links.filter(link => link.captain_id === form.captain_id && !link.archived_at && !link.frozen_at && !link.pending
      && link.access_until >= today && (link.sessions_left == null || link.sessions_left > 0)
      && !lastSent.some(r => r.form_id === form.id && r.player_id === link.player_id
        && (r.answered_at === null || localDate(new Date(r.sent_at)) >= start)))
      .map(link => ({ form_id: form.id, player_id: link.player_id, captain_id: form.captain_id, sent_at: now.toISOString() }));
  });
}
export function dueReminders(requests: readonly { id: string; sent_at: string; answered_at: string | null;
  reminded_at: string | null; remind_after_hours: number | null }[], now: Date): string[] {
  return requests.filter(r => !r.answered_at && !r.reminded_at && r.remind_after_hours !== null
    && now.getTime() - Date.parse(r.sent_at) >= r.remind_after_hours * 3_600_000).map(r => r.id);
}
