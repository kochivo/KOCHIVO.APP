'use server';
import { getTimezone } from '@/core/timezone/server';

import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { getT } from '@/core/i18n/server';
import { localDate } from '@/lib/dates';
import { inboxClient } from './client';
import { messages } from '../messages';
import type { TriageInputs } from '../triage';
import type { Result } from '../types';
import { internationalEnabled } from '@/lib/international-enabled';
import { profileTimezone } from '@/lib/timezone';
import { daysBetween } from '@/lib/dates';

export async function listTriageInputs(playerIds: string[], at: string): Promise<Result<TriageInputs>> {
  const t = await getT(messages);
  const parsed = z.object({ playerIds: z.array(z.uuid()).max(1000), at: z.iso.datetime() }).safeParse({ playerIds, at });
  if (!parsed.success) return { error: t('loadFailed') };
  const ids = [...new Set(parsed.data.playerIds)];
  if (!ids.length) return { data: { history: [], dailyChecks: [] } };
  try {
    const client = await inboxClient();
    const auth = await client.auth.getClaims();
    if (auth.error || !auth.data?.claims.sub) return { error: t('signIn') };
    const today = localDate(new Date(at), await getTimezone());
    const international = internationalEnabled();
    const start = new Date(`${today}T12:00:00Z`);
    start.setUTCDate(start.getUTCDate() - (international ? 8 : 6));
    const end = new Date(`${today}T12:00:00Z`);
    end.setUTCDate(end.getUTCDate() + (international ? 2 : 0));
    const [players, daily] = await Promise.all([
      client.from('profiles').select('id,timezone,check_ins!check_ins_player_id_fkey(id,player_id,week_start,body_weight_kg,waist_cm)')
        .in('id', ids).eq('check_ins.captain_id', auth.data.claims.sub)
        .order('week_start', { referencedTable: 'check_ins', ascending: false })
        .order('id', { referencedTable: 'check_ins' }).limit(4, { referencedTable: 'check_ins' }).limit(ids.length),
      client.from('daily_checks').select('player_id,log_date,sleep_hours,soreness,deleted_at')
        .in('player_id', ids).is('deleted_at', null).gte('log_date', localDate(start, 'UTC')).lte('log_date', localDate(end, 'UTC'))
        .order('log_date', { ascending: false }).limit(ids.length * (international ? 11 : 7)),
    ]);
    if (players.error || daily.error || !players.data || !daily.data) throw new Error();
    const zones = new Map(players.data.map(player => [player.id, profileTimezone(player.timezone)]));
    const dailyChecks = international ? daily.data.filter(row => {
      const age = daysBetween(row.log_date, localDate(new Date(at), zones.get(row.player_id)));
      return age >= 0 && age < 7;
    }) : daily.data;
    return { data: { history: players.data.flatMap(player => player.check_ins), dailyChecks } };
  } catch (error) { unstable_rethrow(error); return { error: t('loadFailed') }; }
}
