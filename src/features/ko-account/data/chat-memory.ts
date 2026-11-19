import 'server-only';
import type { KoActor } from './account';
import type { Intent } from './intents';
import { loadChatMemory, saveMemory } from './memory';

export function readChatMemory(actor: KoActor, enabled: boolean) {
  return enabled ? loadChatMemory(actor) : Promise.resolve({ learning: false, memories: [] });
}

export async function rememberFromPlan(
  actor: KoActor, intents: readonly Intent[], state: Awaited<ReturnType<typeof readChatMemory>>, now: number,
) {
  if (!state.learning) return;
  const existing = state.memories.map(row => row.text);
  for (const intent of intents) {
    if (intent.kind !== 'remember') continue;
    const saved = await saveMemory(actor, intent.args, existing, now);
    if (saved) return saved;
  }
}
