import type { ToolContext } from '../types';
import { ToolError } from '../tool-error';

export function checked<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}

export function checkedRows<T>(result: { data: T[] | null; error: unknown }): T[] {
  const rows = checked(result);
  if (!rows) throw new Error('Database rows unavailable');
  return rows;
}

export async function roster({ actor, signal }: ToolContext) {
  return checkedRows(await actor.db.rpc('captain_roster').abortSignal(signal));
}

export async function rosterAthlete(ctx: ToolContext, id: string) {
  const player = (await roster(ctx)).find(row => row.player_id === id);
  if (!player) throw new ToolError('not_found');
  return player;
}
