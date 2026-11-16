import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import type { PainReportRow, PainReply } from '@/core/offline/pain-tables';
import type { Locale } from '@/core/i18n/locale';

export type PainAlertReport = PainReportRow & { player_id: string; player_name: string; exercise_name: string;
  repeat_count: number; status: 'open' | 'answered'; reply: PainReply | null; answered_at: string | null };

export async function loadPainReports(playerId: string, locale: Locale, signal?: AbortSignal): Promise<PainAlertReport[]> {
  const client = await loadSupabaseBrowser();
  const expired = await client.rpc('expire_pain_swaps');
  if (expired.error) throw expired.error;
  const result = await client.from('pain_reports').select('*').eq('player_id', playerId).eq('status', 'open')
    .order('created_at', { ascending: false }).limit(30).abortSignal(signal ?? new AbortController().signal);
  if (result.error) throw result.error;
  return Promise.all(result.data.map(async report => {
    const [profile, exercise, count] = await Promise.all([
      client.from('profiles').select('full_name').eq('id', report.player_id).single(),
      report.exercise_id ? client.from('exercises').select('name_ar,name_en').eq('id', report.exercise_id).maybeSingle()
        .then(result => ({ ...result, data: result.data ? { exercises: result.data } : null }))
        : report.program_exercise_id ? client.from('program_exercises').select('exercises(name_ar,name_en)')
        .eq('id', report.program_exercise_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      client.rpc('pain_repeat_count', { p_player: report.player_id, p_area: report.area }),
    ]);
    if (profile.error || exercise.error || count.error) throw profile.error ?? exercise.error ?? count.error;
    return { ...report, player_name: profile.data?.full_name ?? '',
      exercise_name: locale === 'ar' ? exercise.data?.exercises?.name_ar ?? exercise.data?.exercises?.name_en ?? '' : exercise.data?.exercises?.name_en ?? '', repeat_count: count.data ?? 0 };
  }));
}

export class PainAnswerError extends Error {
  readonly key: 'noSafeSwap' | 'inactiveExercise' | 'failed';
  constructor(error: { message: string }) {
    super(error.message);
    this.key = error.message === 'No safe alternative' ? 'noSafeSwap'
      : error.message === 'Active exercise required' ? 'inactiveExercise' : 'failed';
  }
}

export async function answerPain(id: string, reply: PainReply): Promise<void> {
  const client = await loadSupabaseBrowser();
  const { error } = await client.rpc('answer_pain', { p_report: id, p_reply: reply });
  if (error) throw new PainAnswerError(error);
}
