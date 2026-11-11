'use server';
import 'server-only';
import { supabaseServer } from '@/core/supabase/server';
import { localDate } from '@/lib/dates';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { z } from 'zod';
import { cairoMidnight, weekStart } from '../time';

export async function loadQueueCounts(at: string) {
  const t = await getT(messages);
  const now = new Date(z.iso.datetime().parse(at));
  const client = await supabaseServer();
  const auth = await client.auth.getClaims();
  if (auth.error || !auth.data?.claims.sub) throw new Error(t('error'));
  const captain = auth.data.claims.sub;
  const lateAt = new Date(now.getTime() - 86_400_000).toISOString();
  const weekAt = new Date(weekStart(now)).toISOString();
  const end = localDate(new Date(now.getTime() + 7 * 86_400_000));
  const tables = await Promise.all((['check_ins', 'form_checks'] as const).map(async table => {
    const base = () => client.from(table).select('id', { count: 'exact', head: true }).eq('captain_id', captain).limit(1);
    const results = await Promise.all([base().is('reviewed_at', null),
      base().is('reviewed_at', null).lt('created_at', lateAt), base().not('reviewed_at', 'is', null),
      base().gte('reviewed_at', weekAt).lte('reviewed_at', at)]);
    if (results.some(result => result.error)) throw new Error(t('error'));
    return results.map(result => result.count ?? 0);
  }));
  const renewal = () => client.from('coach_clients').select('id', { count: 'exact', head: true })
    .eq('captain_id', captain).is('archived_at', null).is('frozen_at', null).eq('pending', false)
    .gte('access_until', localDate(now)).lte('access_until', end).limit(1);
  const cutoff = localDate(new Date(now.getTime() + 6 * 86_400_000));
  const lateQuery = renewal();
  if (now.getTime() > cairoMidnight(localDate(now))) lateQuery.lte('access_until', cutoff);
  else lateQuery.lt('access_until', cutoff);
  const [renewals, lateRenewals] = await Promise.all([renewal(), lateQuery]);
  if (renewals.error || lateRenewals.error) throw new Error(t('error'));
  const total = (index: number) => tables.reduce((sum, counts) => sum + (counts[index] ?? 0), 0);
  const needsReply = total(0) + (renewals.count ?? 0), reviewed = total(2);
  return { needsReply, late: total(1) + (lateRenewals.count ?? 0), reviewed,
    reviewedWeek: total(3), all: needsReply + reviewed };
}
