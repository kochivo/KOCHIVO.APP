import 'server-only';
import { z } from 'zod';
import { koAccountConfig } from '@/features/ko-entry/server';
import { getKoActor } from './account';
import { feedbackSchema, submitFeedback } from './feedback';
import { loadMemory } from './memory';

const payload = z.discriminatedUnion('operation', [
  z.strictObject({ operation: z.literal('list') }),
  z.strictObject({ operation: z.literal('learning'), learning: z.boolean() }),
  z.strictObject({ operation: z.literal('delete'), id: z.uuid() }),
  z.strictObject({ operation: z.literal('deleteAll') }),
  z.strictObject({ operation: z.literal('feedback'), feedback: feedbackSchema }),
]);

function reply(data: object, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function postKoLearning(request: Request) {
  const config = koAccountConfig();
  if (!config || request.headers.get('origin') !== config.origin.origin ||
      request.headers.get('host') !== config.origin.host) return reply({ error: 'unavailable' }, 404);
  const size = Number(request.headers.get('content-length'));
  if (!Number.isSafeInteger(size) || size <= 0 || size > 24_000 ||
      !request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'invalid' }, 400);
  try {
    const actor = await getKoActor();
    if (!actor || !config.pilots.has(actor.id)) return reply({ error: 'unauthorized' }, 403);
    const parsed = payload.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return reply({ error: 'invalid' }, 400);
    const input = parsed.data;
    if (input.operation === 'list') return reply(await loadMemory(actor));
    if (input.operation === 'feedback') {
      return await submitFeedback(actor, input.feedback) ? reply({ ok: true }) : reply({ error: 'rateLimit' }, 429);
    }
    if (input.operation === 'learning') {
      const { error } = await actor.db.from('ko_memory_settings').upsert({ user_id: actor.id, learning: input.learning });
      if (error) throw error;
    } else {
      const deletion = actor.db.from('ko_memories').delete().eq('user_id', actor.id);
      const { error } = await (input.operation === 'delete' ? deletion.eq('id', input.id) : deletion);
      if (error) throw error;
    }
    return reply({ ok: true });
  } catch {
    return reply({ error: 'failed' }, 502);
  }
}
