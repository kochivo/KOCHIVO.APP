import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { rosterClient } from './client';
import type { RosterResult } from '../types';

export async function fetchRoster(): Promise<RosterResult> {
  try {
    const client = await rosterClient();
    const { data, error } = await client.rpc('captain_roster');
    if (error || !data) return { error: (await getT(messages))('couldntLoadPlayersTryAgain') };
    return { players: data.map((row) => ({
      playerId: row.player_id, fullName: row.full_name, accessUntil: row.access_until,
      startedOn: row.started_on, lastTrainingDate: row.last_training_date,
      programTitle: row.program_title, openTasks: row.open_tasks,
    })) };
  } catch (error) {
    unstable_rethrow(error);
    return { error: (await getT(messages))('couldntLoadPlayersTryAgain') };
  }
}

export async function fetchCaptainFirstName(): Promise<string> {
  try {
    const client = await rosterClient();
    const { data, error } = await client.auth.getClaims();
    if (error || !data?.claims.sub) return '';
    const profile = await client.from('profiles').select('full_name').eq('id', data.claims.sub).single();
    return profile.data?.full_name.trim().split(/\s+/)[0] ?? '';
  } catch (error) { unstable_rethrow(error); return ''; }
}
