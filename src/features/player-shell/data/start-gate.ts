'use server';
import { supabaseServer } from '@/core/supabase/server';

export async function loadStartGate() {
  const client = await supabaseServer();
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error('Missing session');
  const player = auth.data.user.id;
  const profile = await client.from('profiles').select('full_name').eq('id', player).single();
  if (profile.error) throw profile.error;
  const captain = await client.rpc('my_captain_id');
  if (captain.error) throw captain.error;
  const rows: { id: string; answered_at: string | null; blocks_access: boolean; title: string }[] = [];
  if (!captain.data) return { name: profile.data.full_name, rows };
  for (let offset = 0; ; offset += 500) {
    const result = await client.from('form_requests')
      .select('id,answered_at,blocks_access,forms!form_requests_form_id_fkey(title)')
      .eq('player_id', player).eq('captain_id', captain.data).eq('blocks_access', true).order('sent_at').order('id').range(offset, offset + 499);
    if (result.error) throw result.error;
    rows.push(...result.data.map(row => ({ id: row.id, answered_at: row.answered_at, blocks_access: row.blocks_access, title: row.forms?.title ?? '' })));
    if (result.data.length < 500) break;
  }
  return { name: profile.data.full_name, rows };
}
