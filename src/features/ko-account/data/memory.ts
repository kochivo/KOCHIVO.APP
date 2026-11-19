import 'server-only';
import { uuidv7 } from '@/core/offline/ids';
import { resolvePlayer } from './account';
import type { KoActor } from './account';
import { validateMemory } from './memory-validation';
import type { Remember } from './memory-validation';

export async function loadMemory(actor: KoActor) {
  const [settings, memories] = await Promise.all([
    actor.db.from('ko_memory_settings').select('learning').eq('user_id', actor.id).maybeSingle(),
    actor.db.from('ko_memories').select('id,text').eq('user_id', actor.id)
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(30),
  ]);
  if (settings.error || memories.error) throw settings.error ?? memories.error;
  return { learning: settings.data?.learning ?? true, memories: memories.data };
}

export async function loadChatMemory(actor: KoActor) {
  try {
    return await loadMemory(actor);
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
