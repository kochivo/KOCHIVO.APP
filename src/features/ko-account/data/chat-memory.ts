import 'server-only';
import type { KoActor } from './account';
import type { Intent } from './intents';
import { loadChatMemory, saveMemory } from './memory';

export function readChatMemory(actor: KoActor, enabled: boolean, playerId?: string) {
  return enabled ? loadChatMemory(actor, playerId) : Promise.resolve({ learning: false, memories: [] });
}

export async function rememberFromPlan(
  actor: KoActor, intents: readonly Intent[], state: Awaited<ReturnType<typeof readChatMemory>>, now: number,
) {
  if (!state.learning) return;
  // `existing` comes from the scoped load above, so dedup uses the same
  // (user, player) scope as the memories fed to Gemini; the unique index is
  // the backstop for a note that names a different player than the context.
  const existing = state.memories.map(row => row.text);
  for (const intent of intents) {
    if (intent.kind !== 'remember') continue;
    const saved = await saveMemory(actor, intent.args, existing, now);
    if (saved) return saved;
  }
}
