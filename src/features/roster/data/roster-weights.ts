import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { checkinSnapshot, formSnapshot, mergePlayerFile } from '@/features/player-file';
import type { Snapshot } from '@/features/player-file';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export async function rosterWeights(client: SupabaseClient<AppDatabase>, ids: string[],
  intake: { player_id: string; weight_kg: number; created_at: string; completed_at: string | null; updated_at: string | null }[],
  now: Date,
) {
  if (!ids.length) return {};
  // Embedded limits apply per player, matching the player file's bounded history.
  const checkins = await client.from('profiles')
    .select('id,check_ins!check_ins_player_id_fkey(id,created_at,body_weight_kg,waist_cm,notes)')
    .in('id', ids).order('created_at', { referencedTable: 'check_ins', ascending: false })
    .order('id', { referencedTable: 'check_ins', ascending: false }).limit(12, { referencedTable: 'check_ins' });
  if (checkins.error) throw checkins.error;
  const snapshots = new Map<string, Snapshot[]>(intake.map(row => [row.player_id, [{
    source: { kind: 'intake', id: row.player_id, at: row.updated_at ?? row.completed_at ?? row.created_at },
    facts: { weight: row.weight_kg },
  }]]));
  for (const profile of checkins.data) {
    snapshots.set(profile.id, [...(snapshots.get(profile.id) ?? []), ...profile.check_ins.map(checkinSnapshot)]);
  }
  if (captainWorkspaceEnabled()) {
    const forms = await client.from('profiles').select(`id,form_requests!form_requests_player_id_fkey(
      id,answered_at,forms!form_requests_form_id_fkey(form_questions(id,maps_to)),form_answers(question_id,value))`)
      .in('id', ids).not('form_requests.answered_at', 'is', null)
      .order('answered_at', { referencedTable: 'form_requests', ascending: false })
      .order('id', { referencedTable: 'form_requests' }).limit(12, { referencedTable: 'form_requests' });
    if (forms.error) throw forms.error;
    for (const profile of forms.data) for (const request of profile.form_requests) {
      if (!request.answered_at) continue;
      const snapshot = formSnapshot({ id: request.id, answered_at: request.answered_at },
        request.form_answers, request.forms?.form_questions ?? []);
      snapshots.set(profile.id, [...(snapshots.get(profile.id) ?? []), snapshot]);
    }
  }
  return Object.fromEntries([...snapshots].map(([id, rows]) => [id, mergePlayerFile(rows, now).weight?.value]));
}
