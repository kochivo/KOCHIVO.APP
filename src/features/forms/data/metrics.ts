import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { actionTimezone } from '@/core/timezone/action-timezone';
import { timezoneMidnight } from '@/lib/timezone';
import { localDate } from '@/lib/dates';
import type { LibraryData, Metrics } from '../types';

export type Period = { start: string; end: string };
type MetricRequest = { form_id: string; player_id: string; sent_at: string; answered_at: string | null };

function summarize(rows: readonly MetricRequest[]): Metrics {
  const players = new Set<string>();
  let elapsed = 0, answered = 0;
  for (const row of rows) {
    players.add(row.player_id);
    if (row.answered_at) {
      elapsed += Date.parse(row.answered_at) - Date.parse(row.sent_at);
      answered++;
    }
  }
  return { active: 0, sent: rows.length, answered, recipients: players.size,
    averageHours: answered ? elapsed / answered / 3_600_000 : null };
}

export function libraryMetrics(rows: readonly MetricRequest[], formIds: readonly string[]): Pick<LibraryData, 'metrics' | 'byForm'> {
  const groups = new Map<string, MetricRequest[]>();
  for (const row of rows) {
    const group = groups.get(row.form_id) ?? [];
    group.push(row);
    groups.set(row.form_id, group);
  }
  return { metrics: { ...summarize(rows), active: formIds.length },
    byForm: Object.fromEntries(formIds.map(id => [id, summarize(groups.get(id) ?? [])])) };
}

export async function loadMetricRequests(client: SupabaseClient<AppDatabase>, captain: string, period: Period,
  signal?: AbortSignal): Promise<MetricRequest[]> {
  const rows: MetricRequest[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = client.from('form_requests').select('form_id,player_id,sent_at,answered_at').eq('captain_id', captain)
      .gte('sent_at', period.start).lt('sent_at', period.end).order('id').range(offset, offset + 499);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
function cairoMidnight(year: number, month: number, timezone: string): string {
  const utc = Date.UTC(year, month, 1);
  return new Date(timezoneMidnight(localDate(new Date(utc), 'UTC'), timezone)).toISOString();
}
export function monthPeriod(now: Date, timezone = actionTimezone()): Period {
  const date = localDate(now, timezone);
  const year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7));
  return { start: cairoMidnight(year, month - 1, timezone), end: cairoMidnight(year, month, timezone) };
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
