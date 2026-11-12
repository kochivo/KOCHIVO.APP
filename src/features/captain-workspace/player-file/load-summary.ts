import 'server-only';
import { supabaseServer } from '@/core/supabase/server';
import { currentClaims } from '@/core/supabase/claims';
import { readPlayerFile } from './read-player-file';
import { saturdayWeek } from '@/lib/dates';
import type { FileSummary } from './types';

export async function loadSummary(playerId: string, today: string): Promise<FileSummary> {
  const client = await supabaseServer();
  const claims = await currentClaims();
  const captainId = claims.data?.claims.sub;
  if (claims.error || !captainId) throw new Error('Unauthenticated');
  const [file, subscription, latest, week, requests] = await Promise.all([
    readPlayerFile(playerId),
    client.from('coach_clients').select('access_until,started_on,pending,frozen_at,sessions_left')
      .eq('captain_id', captainId).eq('player_id', playerId).is('archived_at', null).single(),
    client.from('workout_sessions').select('training_date').eq('player_id', playerId).not('completed_at', 'is', null)
      .order('training_date', { ascending: false }).limit(1),
    client.from('workout_sessions').select('training_date').eq('player_id', playerId).not('completed_at', 'is', null)
      .gte('training_date', saturdayWeek(today)[0]).lte('training_date', today),
    client.from('form_requests').select('form_id,due_at,answered_at').eq('player_id', playerId).eq('captain_id', captainId)
      .order('sent_at', { ascending: false }).limit(50),
  ]);
  if (subscription.error || !subscription.data || latest.error || week.error || requests.error)
    throw subscription.error ?? latest.error ?? week.error ?? requests.error ?? new Error('Subscription missing');
  const rows = requests.data ?? [];
  const scheduled = rows.filter(row => !row.answered_at).sort((a, b) => (a.due_at ?? '').localeCompare(b.due_at ?? ''));
  const current = scheduled[0] ?? rows[0];
  let assessment: FileSummary['assessment'] = null;
  if (current) {
    const form = await client.from('forms').select('title').eq('id', current.form_id).single();
    if (form.error) throw form.error;
    assessment = { title: form.data.title, next: current.answered_at ? null : current.due_at,
      last: rows.flatMap(row => row.answered_at ? [row.answered_at] : []).sort().at(-1) ?? null };
  }
  return { file, subscription: subscription.data, lastTraining: latest.data?.[0]?.training_date ?? null,
    completedDays: new Set((week.data ?? []).map(row => row.training_date)).size, assessment };
}
