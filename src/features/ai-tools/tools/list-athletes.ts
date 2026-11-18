import { z } from 'zod';
import { localDate } from '@/lib/dates';
import { endingSoon } from '@/lib/ending-soon';
import { checkedRows, roster } from '../data/read';
import { defineTool } from '../define-tool';

export const listAthletes = defineTool({
  name: 'list_athletes',
  description: 'List up to 200 athletes on your roster, optionally filtered by subscription status.',
  input: z.strictObject({ status: z.enum(['active', 'ending_soon', 'inactive']).optional() }),
  output: z.array(z.object({
    id: z.uuid(), name: z.string(), accessUntil: z.iso.date().nullable(),
    lastTraining: z.iso.date().nullable(), program: z.string().nullable(),
  })).max(200),
  roles: ['captain'],
  kind: 'read',
  async run(ctx, { status }) {
    const rows = await roster(ctx);
    const today = localDate(ctx.now, ctx.timezone);
    const filtered = status && rows.length ? await filterAthletes(ctx, rows, today, status) : rows;
    return filtered.slice(0, 200).map(row => ({
      id: row.player_id, name: row.full_name, accessUntil: row.access_until ?? null,
      lastTraining: row.last_training_date ?? null, program: row.program_title ?? null,
    }));
  },
});

async function filterAthletes(
  { actor, signal }: Parameters<typeof roster>[0],
  rows: Awaited<ReturnType<typeof roster>>,
  today: string,
  status: 'active' | 'ending_soon' | 'inactive',
) {
  const links = checkedRows(await actor.db.from('coach_clients').select('player_id,pending,frozen_at')
    .eq('captain_id', actor.id).is('archived_at', null).abortSignal(signal));
  const active = new Set(links.filter(link => !link.pending && !link.frozen_at).map(link => link.player_id));
  return rows.filter(row => {
    if (!active.has(row.player_id) || !row.access_until || row.access_until < today) return status === 'inactive';
    return status === (endingSoon(today, row.access_until) ? 'ending_soon' : 'active');
  });
}
