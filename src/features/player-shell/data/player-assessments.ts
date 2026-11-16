import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import type { Tables } from '@/types/database';

export async function loadPlayerAssessments() {
  const client = await loadSupabaseBrowser();
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error('Missing session');
  const result = await client.from('form_requests')
    .select('id,due_at,forms!form_requests_form_id_fkey(title)')
    .eq('player_id', auth.data.user.id).is('answered_at', null)
    .order('due_at', { ascending: true, nullsFirst: false }).limit(12);
  if (result.error) throw result.error;
  return result.data;
}

export type DueAssessment = Awaited<ReturnType<typeof loadPlayerAssessments>>[number];
export type PastAssessment = {
  id: string; answered_at: string; forms: { title: string } | null;
  reviewed_at: string | null; captain_reply: string | null;
  headline: { value: number; labelAr: string; labelEn: string } | null;
};
export type PlayerAssessmentHistory = { due: DueAssessment[]; past: PastAssessment[] };

export async function loadPlayerAssessmentHistory(): Promise<PlayerAssessmentHistory> {
  const client = await loadSupabaseBrowser();
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error('Missing session');
  const [due, history] = await Promise.all([
    loadPlayerAssessments(),
    client.from('form_requests')
      .select('id,form_id,answered_at,reviewed_at,captain_reply,forms!form_requests_form_id_fkey(title)')
      .eq('player_id', auth.data.user.id).not('answered_at', 'is', null)
      .order('answered_at', { ascending: false }).order('id').limit(50),
  ]);
  if (history.error) throw history.error;
  if (!history.data.length) return { due, past: [] };
  const formIds = [...new Set(history.data.map(row => row.form_id))];
  const requestIds = history.data.map(row => row.id);
  const questions: Pick<Tables<'form_questions'>, 'id' | 'form_id' | 'type' | 'maps_to' | 'label_ar' | 'label_en' | 'show_chart' | 'position'>[] = [];
  const answers: Pick<Tables<'form_answers'>, 'id' | 'request_id' | 'question_id' | 'value'>[] = [];
  for (let offset = 0; ; offset += 500) {
    const [q, a] = await Promise.all([
      client.from('form_questions').select('id,form_id,type,maps_to,label_ar,label_en,show_chart,position')
        .in('form_id', formIds).order('position').order('id').range(offset, offset + 499),
      client.from('form_answers').select('id,request_id,question_id,value')
        .in('request_id', requestIds).order('id').range(offset, offset + 499),
    ]);
    if (q.error || a.error) throw q.error ?? a.error;
    questions.push(...q.data); answers.push(...a.data);
    if (q.data.length < 500 && a.data.length < 500) break;
  }
  const past = history.data.flatMap(row => {
    if (!row.answered_at) return [];
    // Prefer the mapped weight, then charted measurements, then other numeric answers.
    const numeric = questions.filter(q => q.form_id === row.form_id && (q.type === 'number' || q.type === 'scale'))
      .sort((a, b) => Number(b.maps_to === 'weight') - Number(a.maps_to === 'weight') || Number(Boolean(b.show_chart)) - Number(Boolean(a.show_chart)));
    let headline: PastAssessment['headline'] = null;
    for (const question of numeric) {
      const value = answers.find(a => a.request_id === row.id && a.question_id === question.id)?.value;
      if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) continue;
      const number = Number(value);
      if (!Number.isFinite(number)) continue;
      headline = { value: number, labelAr: question.label_ar, labelEn: question.label_en || question.label_ar };
      break;
    }
    return [{ id: row.id, answered_at: row.answered_at, reviewed_at: row.reviewed_at,
      captain_reply: row.captain_reply, forms: row.forms, headline }];
  });
  return { due, past };
}
