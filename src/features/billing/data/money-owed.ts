import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getTimezone } from '@/core/timezone/server';
import { fetchRoster } from '@/features/roster/server';
import { localDate } from '@/lib/dates';
import type { AppDatabase } from '@/types/app-database';
import { captainClient } from './client';
import { buildMoneyOwed, moneyOwedSoon } from './money-owed-model';
import type { MoneyOwedRecord } from './money-owed-model';
export type { MoneyOwed, MoneyOwedRow } from './money-owed-model';

type MoneyDatabase = Omit<AppDatabase, 'public'> & {
  public: Omit<AppDatabase['public'], 'Functions'> & {
    Functions: AppDatabase['public']['Functions'] & {
      captain_money_owed: { Args: Record<string, never>; Returns: MoneyOwedRecord[] };
    };
  };
};

export async function fetchMoneyOwed(now = new Date()) {
  const [{ client, captainId }, roster, timezone] = await Promise.all([captainClient(), fetchRoster(), getTimezone()]);
  if (roster.error || !roster.players) throw new Error('Money owed roster unavailable');
  // Keep the additive migration contract local until database types are regenerated.
  const moneyClient = client as unknown as SupabaseClient<MoneyDatabase>;
  const records: MoneyOwedRecord[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await moneyClient.rpc('captain_money_owed').order('player_id').order('reason').range(offset, offset + 499);
    if (page.error) throw page.error;
    records.push(...page.data);
    if (page.data.length < 500) break;
  }
  const today = localDate(now, timezone);
  const owing = new Set(records.map(row => row.player_id));
  const soon = roster.players.filter(player => moneyOwedSoon(player, today, owing));
  const prices = new Map<string, number | null>();
  for (let chunk = 0; chunk < soon.length; chunk += 100) {
    const ids = soon.slice(chunk, chunk + 100).map(player => player.playerId);
    for (let offset = 0; ; offset += 500) {
      const page = await client.from('player_payments').select('player_id,price_egp,captain_packages(price_egp)')
        .eq('captain_id', captainId).in('player_id', ids)
        .order('period_end', { ascending: false }).order('created_at', { ascending: false }).order('id', { ascending: false })
        .range(offset, offset + 499);
      if (page.error) throw page.error;
      for (const row of page.data) if (!prices.has(row.player_id)) prices.set(row.player_id, row.captain_packages?.price_egp ?? row.price_egp);
      if (page.data.length < 500) break;
    }
  }
  return buildMoneyOwed(records, roster.players, prices, now, timezone);
}
