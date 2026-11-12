import { loadSupabaseBrowser } from '@/core/supabase/lazy';

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
