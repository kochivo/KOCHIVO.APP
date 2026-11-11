import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import type { FormDraft, LibraryData, Question } from '../types';
import { loadMetrics, monthPeriod } from './metrics';
import { decodeQuestion, decodeSchedule } from './validation';

export async function loadLibrary(client: SupabaseClient<AppDatabase>, captain: string, now: Date,
  signal: AbortSignal = new AbortController().signal): Promise<LibraryData> {
  const forms: FormDraft[] = [];
  for (let offset = 0; ; offset += 100) {
    const result = await client.from('forms').select('*').eq('captain_id', captain).is('archived_at', null)
      .order('created_at').order('id').range(offset, offset + 99).abortSignal(signal);
    if (result.error) throw result.error;
    for (const row of result.data) {
      const questions: Question[] = [];
      for (let start = 0; ; start += 500) {
        const result = await client.from('form_questions').select('*').eq('form_id', row.id).order('position')
          .range(start, start + 499).abortSignal(signal);
        if (result.error) throw result.error;
        questions.push(...result.data.map(decodeQuestion));
        if (result.data.length < 500) break;
      }
      forms.push({ ...row, schedule: decodeSchedule(row.schedule), questions });
    }
    if (result.data.length < 100) break;
  }
  const period = monthPeriod(now);
  const metrics = await loadMetrics(client, captain, period, undefined, signal);
  metrics.active = forms.length;
  const byForm: LibraryData['byForm'] = {};
  for (const form of forms) byForm[form.id] = await loadMetrics(client, captain, period, form.id, signal);
  return { forms, metrics, byForm };
}
