import type { SupabaseClient } from '@supabase/supabase-js';
import { localDate } from '@/lib/dates';
import { readPlayerTimezone } from '@/core/timezone/player-timezone';
import type { AppDatabase } from '@/types/app-database';
import { checkinSnapshot, intakeSnapshot, formSnapshot } from '../model';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import type { PlayerFile } from '../model';
import { formHistory, mergePlayerFile } from '../merge';

interface LoadOptions { checkinLimit?: number; now?: Date; lastViewedAt?: string; timezone?: string }

/** Pass the caller's authenticated client: existing table RLS controls player access. */
export async function loadPlayerFile(
  client: SupabaseClient<AppDatabase>, playerId: string,
  { checkinLimit = 12, now = new Date(), lastViewedAt, timezone }: LoadOptions = {},
): Promise<PlayerFile> {
  if (!Number.isSafeInteger(checkinLimit) || checkinLimit < 0) throw new RangeError('Invalid check-in limit');
  const zonePromise = timezone ?? readPlayerTimezone(client, playerId);
  const [intake, checkins, zone] = await Promise.all([
    client.from('player_intake')
      .select('player_id,birth_year,sex,height_cm,weight_kg,target_weight_kg,experience,training_days,session_minutes,injuries,medical,allergies,notes,created_at,completed_at,updated_at')
      .eq('player_id', playerId).limit(1),
    client.from('check_ins').select('id,created_at,body_weight_kg,waist_cm,notes')
      .eq('player_id', playerId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(checkinLimit),
    zonePromise,
  ]);
  if (intake.error) throw intake.error;
  if (checkins.error) throw checkins.error;
  const snapshots = [
    ...(intake.data ?? []).map(row => intakeSnapshot(row, localDate(now, zone))),
    ...(checkins.data ?? []).map(checkinSnapshot),
  ];
  if (captainWorkspaceEnabled()) {
    const requests = await client.from('form_requests').select('id,form_id,answered_at,forms!form_requests_form_id_fkey(title)')
      .eq('player_id',playerId).not('answered_at','is',null)
      .order('answered_at',{ascending:false}).order('id').limit(12);
    if (requests.error) throw requests.error;
    const ids = requests.data.map(r => r.id), formIds = [...new Set(requests.data.map(r => r.form_id))];
    if (ids.length) {
      const [answers,questions] = await Promise.all([
        client.from('form_answers').select('request_id,question_id,value').in('request_id',ids).limit(1200),
        client.from('form_questions').select('id,form_id,maps_to').in('form_id',formIds).not('maps_to','is',null).limit(1200),
      ]);
      if (answers.error || questions.error) throw answers.error ?? questions.error;
      for (const r of requests.data) if (r.answered_at) snapshots.push(formSnapshot({id:r.id,answered_at:r.answered_at,title:r.forms?.title},
        answers.data.filter(a => a.request_id === r.id),questions.data.filter(q => q.form_id === r.form_id)));
    }
  }
  return { facts: mergePlayerFile(snapshots, now, lastViewedAt), history: formHistory(snapshots) };
}
