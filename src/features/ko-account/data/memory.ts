import 'server-only';
import { uuidv7 } from '@/core/offline/ids';
import { resolvePlayer } from './account';
import type { KoActor } from './account';
import { validateMemory } from './memory-validation';
import type { Remember } from './memory-validation';

export async function loadMemory(actor: KoActor, playerId?: string) {
  // Scope is (user, player): a player actor only ever owns general (NULL-player)
  // memories, and a captain reads one player's memories — or their own general
  // notes when no player is in context. Another player's memories must never
  // reach this actor's answers.
  const query = actor.db.from('ko_memories').select('id,text').eq('user_id', actor.id);
  const scoped = actor.role === 'player' || !playerId ? query.is('player_id', null) : query.eq('player_id', playerId);
  const [settings, memories] = await Promise.all([
    actor.db.from('ko_memory_settings').select('learning').eq('user_id', actor.id).maybeSingle(),
    scoped.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(30),
  ]);
  if (settings.error || memories.error) throw settings.error ?? memories.error;
  return { learning: settings.data?.learning ?? true, memories: memories.data };
}

export async function loadChatMemory(actor: KoActor, playerId?: string) {
  try {
    return await loadMemory(actor, playerId);
  } catch {
    console.warn('KO memory read failed');
    return { learning: false, memories: [] };
  }
}

export async function saveMemory(actor: KoActor, input: Remember, existing: readonly string[], now: number) {
  try {
    const player = input.player && actor.role === 'captain' ? await resolvePlayer(actor, input.player) : null;
    const memory = validateMemory(input, existing, player?.id);
    if (!memory) return;
    const id = uuidv7(now);
    const { error } = await actor.db.from('ko_memories').insert({ ...memory, id });
    if (error?.code === '23505' || error?.code === '42501') return;
    if (error) throw error;
    return { id, text: memory.text };
  } catch {
    console.warn('KO memory insert failed');
  }
}
