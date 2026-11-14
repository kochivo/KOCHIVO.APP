import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';
import { fetchRoster } from '../../data/roster';
import { activityRange } from '../model';
import type { Activity } from '../model';

export async function loadActivity(today: string): Promise<{ activity: Activity } | { error: true }> {
  try {
    const client = await supabaseServer();
    const auth = await client.auth.getClaims();
    if (auth.error || !auth.data?.claims.sub) return { error: true };
    const roster = await fetchRoster();
    if (roster.error) return { error: true };
    const ids = (roster.players ?? []).map(player => player.playerId);
    if (!ids.length) return { activity: {} };
    const range = activityRange(roster.players ?? [], today);
    const [sessions, programs, videos, latest, ranks, assessments] = await Promise.all([
      client.from('workout_sessions').select('player_id,training_date').in('player_id', ids)
        .not('completed_at', 'is', null).gte('training_date', range.start).lte('training_date', range.end),
      client.from('programs').select('player_id,program_days(weekday,is_rest_day)').in('player_id', ids)
        .eq('captain_id', auth.data.claims.sub).eq('status', 'active').eq('is_template', false)
        .order('updated_at', { ascending: false }).order('id', { ascending: false }),
      client.from('form_checks').select('player_id').in('player_id', ids).eq('captain_id', auth.data.claims.sub).is('reviewed_at', null),
      // Bound the history per player rather than cutting the whole roster at the API row limit.
      client.from('profiles').select('id,workout_sessions!workout_sessions_player_id_fkey(session_rpe,completed_at)')
        .in('id', ids).not('workout_sessions.completed_at', 'is', null)
        .order('completed_at', { referencedTable: 'workout_sessions', ascending: false }).limit(1, { referencedTable: 'workout_sessions' }),
      client.rpc('team_leaderboard'),
      client.from('form_requests').select('player_id').in('player_id', ids).eq('captain_id', auth.data.claims.sub)
        .not('answered_at', 'is', null).is('reviewed_at', null),
    ]);
    if (sessions.error || programs.error || videos.error || latest.error || ranks.error || assessments.error) return { error: true };
    const activity: Activity = {};
    for (const id of ids) activity[id] = { dates: [], weekdays: [], rpe: null, video: false };
    for (const session of sessions.data) activity[session.player_id]?.dates.push(session.training_date);
    const scheduled = new Set<string>();
    for (const program of programs.data) {
      const row = program.player_id ? activity[program.player_id] : undefined;
      if (!row || !program.player_id || scheduled.has(program.player_id)) continue;
      scheduled.add(program.player_id);
      row.weekdays = program.program_days.flatMap(day => !day.is_rest_day && day.weekday !== null ? [day.weekday] : []);
    }
    for (const video of videos.data) { const row = activity[video.player_id]; if (row) row.video = true; }
    for (const profile of latest.data) { const row = activity[profile.id]; if (row) row.rpe = profile.workout_sessions[0]?.session_rpe ?? null; }
    for (const assessment of assessments.data) {
      const row = activity[assessment.player_id]; if (row) row.assessments = (row.assessments ?? 0) + 1;
    }
    for (const rank of ranks.data) {
      const row = rank.player_id ? activity[rank.player_id] : undefined;
      if (row && (rank.tier === 'beginner' || rank.tier === 'champion' || rank.tier === 'elite' || rank.tier === 'legend')) row.rank = rank.tier;
    }
    return { activity };
  } catch (error) { unstable_rethrow(error); return { error: true }; }
}
