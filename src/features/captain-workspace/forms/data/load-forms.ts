import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import type { Tables } from '@/types/database';
import { adaptForms } from '../adapter';

export async function loadForms(client: SupabaseClient<AppDatabase>, playerId: string, today: string) {
  const intakeQuery = client.from('player_intake').select('*').eq('player_id', playerId).maybeSingle();
  const checksQuery = async () => {
    const rows: Tables<'check_ins'>[] = [];
    for (let offset = 0; ; offset += 500) {
      const result = await client.from('check_ins').select('*').eq('player_id', playerId)
        .order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 499);
      if (result.error) throw result.error;
      rows.push(...result.data);
      if (result.data.length < 500) return rows;
    }
  };
  const [intake, checks] = await Promise.all([intakeQuery, checksQuery()]);
  if (intake.error) throw intake.error;
  return adaptForms(intake.data, checks, today);
}
