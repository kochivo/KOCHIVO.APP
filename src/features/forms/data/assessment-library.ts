import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { getTimezone } from '@/core/timezone/server';
import { localDate } from '@/lib/dates';
import type { FormDraft, Question, Metrics } from '../types';
import { decodeQuestion, decodeSchedule } from './validation';
import { monthPeriod } from './metrics';
import { loadAssessmentWorkspace } from './assessment-workspace';

type Request = { form_id: string; player_id: string; sent_at: string; answered_at: string | null; reviewed_at: string | null };
function metrics(rows: Request[]): Metrics {
  const answered = rows.filter(r => r.answered_at);
  return { active: 0, sent: rows.length, answered: answered.length, recipients: new Set(rows.map(r => r.player_id)).size,
    averageHours: answered.length ? answered.reduce((sum, r) => sum + (Date.parse(r.answered_at ?? '') - Date.parse(r.sent_at)) / 3600000, 0) / answered.length : null };
}
export async function loadAssessmentLibrary(client: SupabaseClient<AppDatabase>, captain: string, now: Date) {
  const workspace = await loadAssessmentWorkspace(client, captain);
  const forms: FormDraft[] = [], questions: Question[] = [], requests: Request[] = [];
  for (let offset = 0; ; offset += 500) {
    const [result, answers, questionRows] = await Promise.all([
      client.from('forms').select('id,captain_id,title,kind,schedule,remind_after_hours').eq('captain_id', captain).is('archived_at', null).order('id').range(offset, offset + 499),
      client.from('form_requests').select('form_id,player_id,sent_at,answered_at,reviewed_at').eq('captain_id', captain).order('id').range(offset, offset + 499),
      client.from('form_questions').select('id,form_id,position,label_ar,label_en,type,required,options,maps_to,alert_on,show_chart,forms!inner(captain_id)')
        .eq('forms.captain_id', captain).is('retired_at', null).order('id').range(offset, offset + 499),
    ]);
    if (result.error || answers.error || questionRows.error) throw result.error ?? answers.error ?? questionRows.error;
    forms.push(...result.data.map(row => ({ ...row, schedule: decodeSchedule(row.schedule), questions: [] })));
    requests.push(...answers.data); questions.push(...questionRows.data.map(decodeQuestion));
    if ([result, answers, questionRows].every(r => r.data.length < 500)) break;
  }
  const timezone = await getTimezone(), period = monthPeriod(now, timezone);
  const today = localDate(now, timezone), at = new Date(`${today}T12:00Z`);
  const dow = (at.getUTCDay() + 1) % 7;
  at.setUTCDate(at.getUTCDate() - dow);
  const weekStart = localDate(at, 'UTC');
  const periodRows = requests.filter(r => r.sent_at >= period.start && r.sent_at < period.end);
  const byForm: Record<string, Metrics> = {};
  const activity: Record<string, { waiting: number; lastAnswer: string | null; sent: boolean }> = {};
  for (const form of forms) {
    form.questions = questions.filter(q => q.form_id === form.id).sort((a,b) => a.position - b.position);
    byForm[form.id] = metrics(periodRows.filter(r => r.form_id === form.id));
    const rows = requests.filter(r => r.form_id === form.id);
    activity[form.id] = { waiting: rows.filter(r => r.answered_at && !r.reviewed_at).length,
      lastAnswer: rows.flatMap(r => r.answered_at ? [r.answered_at] : []).sort().at(-1) ?? null, sent: rows.length > 0 };
  }
  const total = metrics(periodRows); total.active = forms.length;
  return { ...workspace, forms, metrics: total, byForm, activity, now: now.toISOString(), timezone,
    waitingReview: Object.values(activity).reduce((sum, row) => sum + row.waiting, 0),
    pending: requests.filter(r => !r.answered_at).length,
    answeredWeek: requests.filter(r => r.answered_at && localDate(new Date(r.answered_at), timezone) >= weekStart && Date.parse(r.answered_at) <= now.getTime()).length };
}
export type AssessmentLibraryData = Awaited<ReturnType<typeof loadAssessmentLibrary>>;
