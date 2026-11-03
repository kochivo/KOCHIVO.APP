import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import 'server-only';

import { fetchRoster, playerStatus } from '@/features/roster';
import { localDate } from '@/lib/dates';
import { captainClient } from './client';
import type { BillingResult } from '../types';

export async function fetchBillingAt(now: Date): Promise<BillingResult> {
  const t = await getT(messages);
  try {
    const { client, captainId } = await captainClient();
    const [roster, tier] = await Promise.all([
      fetchRoster(), client.rpc('current_tier', { p_captain: captainId }),
    ]);
    if (roster.error || !roster.players || tier.error || !tier.data) throw new Error('billing unavailable');
    const timestamp = now.toISOString();
    const today = localDate(now);
    const ids = roster.players.map((player) => player.playerId);
    const [phones, plan, subscription, payments] = await Promise.all([
      ids.length ? client.from('profiles').select('id, phone').in('id', ids) : { data: [], error: null },
      client.from('plan_tiers').select('tier, price_egp, player_limit').eq('tier', tier.data).single(),
      client.from('captain_subscriptions').select('ends_at').eq('captain_id', captainId).eq('tier', tier.data)
        .lte('starts_at', timestamp).gt('ends_at', timestamp).order('ends_at', { ascending: false }).limit(1).maybeSingle(),
      client.rpc('captain_last_payments'),
    ]);
    if (phones.error || plan.error || !plan.data || subscription.error || payments.error) {
      throw new Error('billing unavailable');
    }
    const phoneMap = new Map(phones.data?.map((profile) => [profile.id, profile.phone]));
    const paymentMap = new Map(payments.data?.map((payment) => [payment.player_id, payment]));
    return { data: {
      players: roster.players.map((player) => ({ ...player, status: playerStatus({ ...player, today }), phone: phoneMap.get(player.playerId) ?? null,
        lastPayment: paymentMap.get(player.playerId) ?? null })),
      plan: plan.data, used: roster.players.length, subscriptionEnd: subscription.data?.ends_at ?? null,
    } };
  } catch { return { error: t('loadFailed') }; }
}
