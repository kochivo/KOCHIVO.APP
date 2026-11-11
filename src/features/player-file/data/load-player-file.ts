import type { SupabaseClient } from '@supabase/supabase-js';
import { localDate } from '@/lib/dates';
import type { Database } from '@/types/database';
import { checkinSnapshot, intakeSnapshot } from '../model';
import type { PlayerFile } from '../model';
import { formHistory, mergePlayerFile } from '../merge';

interface LoadOptions { checkinLimit?: number; now?: Date; lastViewedAt?: string }

/** Pass the caller's authenticated client: existing table RLS controls player access. */
export async function loadPlayerFile(
  client: SupabaseClient<Database>, playerId: string,
  { checkinLimit = 12, now = new Date(), lastViewedAt }: LoadOptions = {},
): Promise<PlayerFile> {
  if (!Number.isSafeInteger(checkinLimit) || checkinLimit < 0) throw new RangeError('Invalid check-in limit');
  const [intake, checkins] = await Promise.all([
    client.from('player_intake')
      .select('player_id,birth_year,sex,height_cm,weight_kg,target_weight_kg,experience,training_days,session_minutes,injuries,medical,allergies,notes,created_at,completed_at,updated_at')
      .eq('player_id', playerId).limit(1),
    client.from('check_ins').select('id,created_at,body_weight_kg,waist_cm,notes')
      .eq('player_id', playerId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(checkinLimit),
  ]);
  if (intake.error) throw intake.error;
  if (checkins.error) throw checkins.error;
  const snapshots = [
    ...(intake.data ?? []).map(row => intakeSnapshot(row, localDate(now))),
    ...(checkins.data ?? []).map(checkinSnapshot),
  ];
  return { facts: mergePlayerFile(snapshots, now, lastViewedAt), history: formHistory(snapshots) };
}
