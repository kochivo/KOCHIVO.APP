import 'server-only';
import { supabaseServer } from '@/core/supabase/server';
export async function hasIntake(): Promise<boolean> {
  const client = await supabaseServer();
  const { data: auth, error: authError } = await client.auth.getClaims();
  if (authError) throw new Error('مش قادرين نتأكد من حسابك. جرّب تاني');
  if (!auth?.claims.sub) throw new Error('ادخل حسابك الأول');
  const { data, error } = await client.from('player_intake').select('player_id')
    .eq('player_id', auth.claims.sub).maybeSingle();
  if (error) throw new Error('مش قادرين نحمّل بياناتك. جرّب تاني');
  return data !== null;
}
