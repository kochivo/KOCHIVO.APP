'use server';

import { z } from 'zod';
import { fetchRoster, playerStatus } from '@/features/roster';
import { localDate } from '@/lib/dates';
import { captainClient } from './client';
import type { BillingResult, RenewalInput } from '../types';

const renewal = z.object({
  playerId: z.uuid(), days: z.number().int().min(1).max(365),
  amount: z.number().int().min(0).max(100000).nullable().default(null),
});
const invalid = 'راجع المدة والمبلغ وجرّب تاني';
const failed = 'التجديد متسجلش. جرّب تاني';

export async function renewPlayer(input: RenewalInput): Promise<{ data: string; error?: never } | { error: string; data?: never }> {
  const parsed = renewal.safeParse(input);
  if (!parsed.success) return { error: invalid };
  try {
    const { client } = await captainClient();
    const { playerId, days, amount } = parsed.data;
    const result = await client.rpc('renew_player', { p_player: playerId, p_days: days, p_amount: amount });
    if (result.error) return { error: result.error.code === '42501' ? 'مش مسموح تجدّد للاعب ده. راجع حسابك'
      : result.error.code === '22023' ? invalid : failed };
    return result.data ? { data: result.data } : { error: failed };
  } catch { return { error: failed }; }
}

export async function fetchBilling(): Promise<BillingResult> {
  try {
    const { client, captainId } = await captainClient();
    const [roster, tier] = await Promise.all([
      fetchRoster(), client.rpc('current_tier', { p_captain: captainId }),
    ]);
    if (roster.error || !roster.players || tier.error || !tier.data) throw new Error('billing unavailable');
    const at = new Date();
    const now = at.toISOString();
    const today = localDate(at);
    const ids = roster.players.map((player) => player.playerId);
    const [phones, plan, subscription, payments] = await Promise.all([
      ids.length ? client.from('profiles').select('id, phone').in('id', ids) : { data: [], error: null },
      client.from('plan_tiers').select('tier, price_egp, player_limit').eq('tier', tier.data).single(),
      client.from('captain_subscriptions').select('ends_at').eq('captain_id', captainId).eq('tier', tier.data)
        .lte('starts_at', now).gt('ends_at', now).order('ends_at', { ascending: false }).limit(1).maybeSingle(),
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
  } catch { return { error: 'مش قادرين نحمّل الاشتراكات. جرّب تاني' }; }
}
