import 'server-only';
import { captainClient } from './client';
import type { Plan } from '../types';

export type PlanSummary = { plan: Plan; used: number };

export async function fetchPlanSummary(): Promise<PlanSummary | null> {
  try {
    const { client, captainId } = await captainClient();
    const tier = await client.rpc('current_tier', { p_captain: captainId });
    if (tier.error || !tier.data) return null;
    const [plan, clients] = await Promise.all([
      client.from('plan_tiers').select('tier, price_egp, player_limit').eq('tier', tier.data).single(),
      client.from('coach_clients').select('player_id', { count: 'exact', head: true })
        .eq('captain_id', captainId).is('archived_at', null),
    ]);
    if (plan.error || !plan.data || clients.error) return null;
    return { plan: plan.data, used: clients.count ?? 0 };
  } catch { return null; }
}
