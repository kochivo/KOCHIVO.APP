import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { localDate } from '@/lib/dates';
import type { Metrics } from '../types';

export type Period = { start: string; end: string };
function cairoMidnight(year: number, month: number): string {
  const utc = Date.UTC(year, month, 1);
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Africa/Cairo', timeZoneName: 'longOffset' }).formatToParts(utc);
  const offset = parts.find(p => p.type === 'timeZoneName')?.value.match(/GMT([+-])(\d+):(\d+)/);
  const minutes = offset ? (Number(offset[2]) * 60 + Number(offset[3])) * (offset[1] === '+' ? 1 : -1) : 0;
  return new Date(utc - minutes * 60_000).toISOString();
}
export function monthPeriod(now: Date): Period {
  const date = localDate(now);
  const year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7));
  return { start: cairoMidnight(year, month - 1), end: cairoMidnight(year, month) };
}
export async function loadMetrics(client: SupabaseClient<AppDatabase>, captain: string, period: Period,
  formId?: string, signal?: AbortSignal): Promise<Metrics> {
  const scoped = () => {
    let query = client.from('form_requests').select('id', { count: 'exact', head: true })
      .eq('captain_id', captain).gte('sent_at', period.start).lt('sent_at', period.end);
    if (formId) query = query.eq('form_id', formId);
    if (signal) query = query.abortSignal(signal);
    return query;
  };
  const [sent, answered] = await Promise.all([scoped(), scoped().not('answered_at', 'is', null)]);
  if (sent.error) throw sent.error;
  if (answered.error) throw answered.error;
  if (sent.count === null || answered.count === null) throw new Error('Missing exact count');
  const players = new Set<string>();
  let elapsed = 0, responseCount = 0;
  for (let offset = 0; ; offset += 500) {
    let query = client.from('form_requests').select('player_id,sent_at,answered_at').eq('captain_id', captain)
      .gte('sent_at', period.start).lt('sent_at', period.end).order('id').range(offset, offset + 499);
    if (formId) query = query.eq('form_id', formId);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    for (const row of data) {
      players.add(row.player_id);
      if (row.answered_at) { elapsed += Date.parse(row.answered_at) - Date.parse(row.sent_at); responseCount++; }
    }
    if (data.length < 500) break;
  }
  return { active: 0, sent: sent.count, answered: answered.count, recipients: players.size,
    averageHours: responseCount ? elapsed / responseCount / 3_600_000 : null };
}
