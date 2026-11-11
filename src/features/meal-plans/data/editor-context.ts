'use server';

import { z } from 'zod';
import { localDate } from '@/lib/dates';
import { loadPlayerFile } from '@/features/player-file';
import { planClient } from './client';
import { adherenceDays } from '../smart-notes';

export async function loadEditorContext(playerId: string) {
  if (!z.uuid().safeParse(playerId).success) throw new Error('Invalid player');
  const client = await planClient();
  const now = new Date();
  const today = localDate(now);
  const since = adherenceDays([], today, [])[0]?.date ?? today;
  const [file, profile, logs] = await Promise.all([
    loadPlayerFile(client, playerId, { now }),
    client.from('profiles').select('full_name').eq('id', playerId).single(),
    client.from('meal_logs').select('log_date,meal_id,completed_at,deleted_at').eq('player_id', playerId)
      .gte('log_date', since).lte('log_date', today).is('deleted_at', null)
      .order('log_date', { ascending: false }).order('id').limit(700),
  ]);
  if (profile.error || logs.error) throw new Error('Could not load meal editor context');
  return { facts: file.facts, name: profile.data.full_name, today, logs: logs.data };
}
