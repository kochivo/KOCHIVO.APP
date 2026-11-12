import 'server-only';
import { supabaseServer } from '@/core/supabase/server';

export async function loadHomeContacts(ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const client = await supabaseServer();
  const auth = await client.auth.getClaims();
  if (auth.error || !auth.data?.claims.sub) throw new Error('Unauthorized');
  const result = await client.from('coach_clients').select('player_id,profiles!coach_clients_player_id_fkey(phone)')
    .eq('captain_id', auth.data.claims.sub).is('archived_at', null).in('player_id', ids);
  if (result.error) throw result.error;
  return new Map(result.data.flatMap(row => row.profiles?.phone ? [[row.player_id, row.profiles.phone] as const] : []));
}
