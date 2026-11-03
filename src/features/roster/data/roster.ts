import 'server-only';
import { rosterClient } from './client';
import type { RosterResult } from '../types';

export async function fetchRoster(): Promise<RosterResult> {
  try {
    const client = await rosterClient();
    const { data, error } = await client.rpc('captain_roster');
    if (error || !data) return { error: 'مش قادرين نحمّل اللاعبين. جرّب تاني' };
    return { players: data.map((row) => ({
      playerId: row.player_id, fullName: row.full_name, accessUntil: row.access_until,
      startedOn: row.started_on, lastTrainingDate: row.last_training_date,
      programTitle: row.program_title, openTasks: row.open_tasks,
    })) };
  } catch {
    return { error: 'مش قادرين نحمّل اللاعبين. جرّب تاني' };
  }
}

export async function fetchCaptainFirstName(): Promise<string> {
  try {
    const client = await rosterClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return '';
    const profile = await client.from('profiles').select('full_name').eq('id', data.user.id).single();
    return profile.data?.full_name.trim().split(/\s+/)[0] ?? '';
  } catch { return ''; }
}
