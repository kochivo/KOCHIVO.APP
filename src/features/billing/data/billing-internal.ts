import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import 'server-only';
import { unstable_rethrow } from 'next/navigation';

import { fetchRoster, playerStatus } from '@/features/roster';
import { localDate } from '@/lib/dates';
import { captainClient } from './client';
import { revenueSince, summarizeRevenue } from '../finance';
import type { BillingResult } from '../types';

export async function fetchBillingAt(now: Date): Promise<BillingResult> {
  const t = await getT(messages);
  try {
    const { client, captainId } = await captainClient();
    const timestamp = now.toISOString();
    const today = localDate(now);
    const since = revenueSince(today);
    const [roster, tier, payments, packages, dues, paid, collected] = await Promise.all([
      fetchRoster(), client.rpc('current_tier', { p_captain: captainId }),
      client.rpc('captain_last_payments'),
      client.from('captain_packages').select('id, name, price_egp, days, kind, sessions').eq('captain_id', captainId)
        .is('archived_at', null).order('created_at'),
      client.rpc('captain_dues'),
      client.from('player_payments').select('amount_egp, created_at').eq('captain_id', captainId).gte('created_at', since),
      client.from('payment_collections').select('amount_egp, created_at').eq('captain_id', captainId).gte('created_at', since),
    ]);
    if (roster.error || !roster.players || tier.error || !tier.data) throw new Error('billing unavailable');
    const ids = roster.players.map((player) => player.playerId);
    const [phones, plan, subscription] = await Promise.all([
      ids.length ? client.from('profiles').select('id, phone').in('id', ids) : { data: [], error: null },
      client.from('plan_tiers').select('tier, price_egp, player_limit').eq('tier', tier.data).single(),
      client.from('captain_subscriptions').select('ends_at').eq('captain_id', captainId).eq('tier', tier.data)
        .lte('starts_at', timestamp).gt('ends_at', timestamp).order('ends_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (phones.error || plan.error || !plan.data || subscription.error || payments.error
      || packages.error || dues.error || paid.error || collected.error) {
      throw new Error('billing unavailable');
    }
    const phoneMap = new Map(phones.data?.map((profile) => [profile.id, profile.phone]));
    const paymentMap = new Map(payments.data?.map((payment) => [payment.player_id, payment]));
    const dueMap = new Map(dues.data.map((row) => [row.player_id, row.due_egp]));
    return { data: {
      players: roster.players.map((player) => ({ ...player, status: playerStatus({ ...player, today }), phone: phoneMap.get(player.playerId) ?? null,
        lastPayment: paymentMap.get(player.playerId) ?? null, due: dueMap.get(player.playerId) ?? 0 })),
      plan: plan.data, used: roster.players.length, subscriptionEnd: subscription.data?.ends_at ?? null,
      packages: packages.data,
      revenue: summarizeRevenue([...paid.data, ...collected.data], dues.data, today),
    } };
  } catch (error) {
    unstable_rethrow(error);
    console.error('Billing load failed', error);
    return { error: t('loadFailed') };
  }
}
