import 'server-only';
import { supabaseServer } from '@/core/supabase/server';

export async function waitlistMember(captainId: string): Promise<boolean> {
  const client = await supabaseServer();
  const auth = await client.auth.getUser();
  if (auth.error) throw auth.error;
  if (!auth.data.user) return false;
  const link = await client.from('coach_clients').select('captain_id').eq('player_id', auth.data.user.id)
    .eq('captain_id', captainId).is('archived_at', null).maybeSingle();
  if (link.error) throw link.error;
  return !!link.data;
}
