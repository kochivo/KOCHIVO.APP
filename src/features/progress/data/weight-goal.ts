import { loadSupabaseBrowser } from '@/core/supabase/lazy';

export async function loadWeightGoal() {
  const client = await loadSupabaseBrowser();
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error('Missing session');
  const result = await client.from('player_intake').select('weight_kg,target_weight_kg')
    .eq('player_id', auth.data.user.id).maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}
