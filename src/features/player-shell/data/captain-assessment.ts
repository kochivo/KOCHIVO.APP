import { loadSupabaseBrowser } from '@/core/supabase/lazy';

export async function loadCaptainAssessment() {
  const client = await loadSupabaseBrowser();
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error('Missing session');
  const result = await client.from('form_requests')
    .select('id,form_id,sent_at,answered_at,forms!form_requests_form_id_fkey(title)')
    .eq('player_id', auth.data.user.id).is('answered_at', null)
    .order('sent_at', { ascending: true }).order('id', { ascending: true }).limit(1);
  if (result.error) throw result.error;
  const request = result.data?.[0];
  if (!request) return [];
  const questions = await client.from('form_questions').select('id', { count: 'exact', head: true }).eq('form_id', request.form_id);
  if (questions.error) throw questions.error;
  return [{ ...request, questionCount: questions.count }];
}
