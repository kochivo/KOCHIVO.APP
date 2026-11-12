import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import type { AssessmentSchedule } from '@/types/assessment-schedules';
import { DEFAULT_TIMEZONE } from '@/lib/dates';
import type { Schedule } from '../types';
import { decodeSchedule } from './validation';

export type AssessmentWorkspaceData = {
  forms: { id: string; title: string; schedule: Schedule | null }[];
  players: { id: string; name: string; timezone: string; joined: string }[];
  schedules: AssessmentSchedule[];
  answers: { form_id: string; player_id: string; answered_at: string | null }[];
  counts: { schedule_id: string; player_id: string; sends: number }[];
};
export async function loadAssessmentWorkspace(client: SupabaseClient<AppDatabase>, captain: string, player?: string): Promise<AssessmentWorkspaceData> {
  const schedules: AssessmentSchedule[] = [], forms: AssessmentWorkspaceData['forms'] = [],
    links: { player_id: string; started_on: string }[] = [], answers: AssessmentWorkspaceData['answers'] = [];
  for (let offset = 0; ; offset += 500) {
    let linkQuery = client.from('coach_clients').select('player_id,started_on').eq('captain_id', captain).is('archived_at', null).eq('pending', false);
    let requestQuery = client.from('form_requests').select('form_id,player_id,answered_at').eq('captain_id', captain).not('answered_at', 'is', null);
    if (player) { linkQuery = linkQuery.eq('player_id', player); requestQuery = requestQuery.eq('player_id', player); }
    const results = await Promise.all([
      client.from('forms').select('id,title,schedule').eq('captain_id', captain).is('archived_at', null).order('id').range(offset, offset + 499),
      client.from('assessment_schedules').select('*').eq('captain_id', captain).order('id').range(offset, offset + 499),
      linkQuery.order('id').range(offset, offset + 499),
      requestQuery.order('answered_at', { ascending: false }).order('id').range(offset, offset + 499),
    ]);
    for (const result of results) if (result.error) throw result.error;
    forms.push(...(results[0].data ?? []).map(f => ({ ...f, schedule: decodeSchedule(f.schedule) }))); schedules.push(...results[1].data ?? []);
    links.push(...results[2].data ?? []); answers.push(...results[3].data ?? []);
    if (results.every(r => (r.data?.length ?? 0) < 500)) break;
  }
  const players: AssessmentWorkspaceData['players'] = [];
  for (let offset = 0; offset < links.length; offset += 100) {
    const chunk = links.slice(offset, offset + 100);
    const profiles = await client.from('profiles').select('id,full_name,timezone').in('id', chunk.map(c => c.player_id));
    if (profiles.error) throw profiles.error;
    for (const p of profiles.data) players.push({ id: p.id, name: p.full_name, timezone: p.timezone ?? DEFAULT_TIMEZONE,
      joined: chunk.find(c => c.player_id === p.id)?.started_on ?? '' });
  }
  const counts = await client.rpc('assessment_schedule_counts');
  if (counts.error) throw counts.error;
  return { forms, players, schedules: player ? schedules.filter(s => !s.player_id || s.player_id === player) : schedules, answers, counts: counts.data };
}
