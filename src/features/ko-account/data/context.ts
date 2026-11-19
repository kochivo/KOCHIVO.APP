import 'server-only';
import { z } from 'zod';
import { resolvePlayer } from './account';
import type { KoActor } from './account';

const contextSchema = z.discriminatedUnion('screen', [
  z.strictObject({ screen: z.literal('player'), playerId: z.uuid() }),
  z.strictObject({ screen: z.literal('program'), programId: z.uuid() }),
  z.strictObject({ screen: z.enum(['home', 'inbox', 'nutrition']) }),
]);

export async function resolveContext(actor: KoActor, raw: unknown) {
  let value: unknown;
  try { value = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return undefined; }
  const parsed = contextSchema.safeParse(value);
  if (!parsed.success || parsed.data.screen !== 'player') return undefined;
  const id = parsed.data.playerId;
  if (actor.role === 'player') return id === actor.id ? await resolvePlayer(actor, undefined) ?? undefined : undefined;
  const { data, error } = await actor.db.rpc('captain_roster');
  if (error) throw error;
  // A name lookup would drop players who share a name.
  const row = data.find(player => player.player_id === id);
  return row ? { id: row.player_id, name: row.full_name } : undefined;
}
