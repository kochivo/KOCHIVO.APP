import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { rosterClient } from './client';
import { loadJoinRequests } from '@/features/coach-page';
import { fetchPlanSummary } from '@/features/billing/server';
import { fetchRoster } from './roster';

export type RosterMeta = { food: boolean; weight: number; target: number | null; experience: string };
export async function loadRosterExtras() {
  try {
    const client = await rosterClient();
    const [roster, plan, requests] = await Promise.all([fetchRoster(), fetchPlanSummary(), loadJoinRequests()]);
    if (roster.error || !plan || requests.error) throw new Error('Roster metadata unavailable');
    const ids = (roster.players ?? []).map(row => row.playerId);
    const [intake, nutrition] = await Promise.all([
      ids.length ? client.from('player_intake').select('player_id,weight_kg,target_weight_kg,experience').in('player_id', ids) : { data: [], error: null },
      ids.length ? client.from('nutrition_plans').select('player_id').in('player_id', ids).eq('status', 'active') : { data: [], error: null },
    ]);
    if (intake.error || nutrition.error) throw new Error('Roster metadata unavailable');
    const food = new Set((nutrition.data ?? []).map(row => row.player_id));
    const meta: Record<string, RosterMeta> = {};
    for (const row of intake.data ?? []) meta[row.player_id] = { food: food.has(row.player_id), weight: row.weight_kg,
      target: row.target_weight_kg, experience: row.experience };
    return { meta, food: [...food], free: Math.max(0, plan.plan.player_limit - plan.used), requests: requests.data ?? [] };
  } catch (error) { unstable_rethrow(error); return { error: true as const }; }
}
