'use server';
import { z } from 'zod';
import { planClient } from '../data/client';
import { fetchRoster } from '@/features/roster';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export async function assignmentPlayers() {
  if (!captainWorkspaceEnabled()) throw new Error('Workspace disabled');
  const result = await fetchRoster();
  if (result.error !== undefined) throw new Error(result.error);
  return result.players.map(player => ({ id: player.playerId, name: player.fullName }));
}

export async function assignPlan(planId: string, playerId: string): Promise<boolean> {
  if (!captainWorkspaceEnabled() || !z.uuid().safeParse(planId).success || !z.uuid().safeParse(playerId).success) return false;
  const client = await planClient();
  const result = await client.rpc('assign_nutrition_template', { p_template: planId, p_player: playerId });
  return !result.error && Boolean(result.data);
}

export async function planPlayers(planId: string): Promise<number> {
  if (!captainWorkspaceEnabled() || !z.uuid().safeParse(planId).success) throw new Error('Invalid plan');
  const client = await planClient();
  const players = new Set<string>();
  for (let start = 0; ; start += 1000) {
    const result = await client.from('nutrition_plans').select('player_id')
      .eq('source_template_id', planId).neq('status', 'archived').order('id').range(start, start + 999);
    if (result.error) throw result.error;
    for (const row of result.data) if (row.player_id) players.add(row.player_id);
    if (result.data.length < 1000) return players.size;
  }
}
