import 'server-only';
import { getTimezone } from '@/core/timezone/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import type { FormDraft, LibraryData, Question } from '../types';
import { libraryMetrics, loadMetricRequests, monthPeriod } from './metrics';
import { decodeQuestion, decodeSchedule } from './validation';

export async function loadLibrary(client: SupabaseClient<AppDatabase>, captain: string, now: Date,
  signal: AbortSignal = new AbortController().signal): Promise<LibraryData> {
  const forms: FormDraft[] = [];
  for (let offset = 0; ; offset += 100) {
    const result = await client.from('forms').select('*').eq('captain_id', captain).is('archived_at', null)
      .order('created_at').order('id').range(offset, offset + 99).abortSignal(signal);
    if (result.error) throw result.error;
    for (const row of result.data) {
      forms.push({ ...row, schedule: decodeSchedule(row.schedule), questions: [] });
    }
    if (result.data.length < 100) break;
  }
  const ids = forms.map(form => form.id);
  const questions = new Map<string, Question[]>();
  if (ids.length) for (let offset = 0; ; offset += 500) {
    const result = await client.from('form_questions').select('*').in('form_id', ids).is('retired_at', null).order('position').order('id')
      .range(offset, offset + 499).abortSignal(signal);
    if (result.error) throw result.error;
    for (const row of result.data) {
      const group = questions.get(row.form_id) ?? [];
      group.push(decodeQuestion(row));
      questions.set(row.form_id, group);
    }
    if (result.data.length < 500) break;
  }
  for (const form of forms) form.questions = questions.get(form.id) ?? [];
  const period = monthPeriod(now, await getTimezone());
  const rows = await loadMetricRequests(client, captain, period, signal);
  return { forms, ...libraryMetrics(rows, ids) };
}
