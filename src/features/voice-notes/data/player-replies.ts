import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';

export async function playerReplies(client: SupabaseClient<AppDatabase>, contextIds: string[]) {
  const ids = [...new Set(contextIds)];
  if (!ids.length) return {};
  const [checkins, forms] = await Promise.all([
    client.from('check_ins').select('id,captain_reply').in('id', ids),
    client.from('form_requests').select('id,captain_reply').in('id', ids),
  ]);
  if (checkins.error || forms.error) throw checkins.error ?? forms.error;
  return Object.fromEntries([...checkins.data, ...forms.data]
    .flatMap(row => row.captain_reply ? [[row.id, row.captain_reply]] : []));
}
