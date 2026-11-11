'use server';
import { getTimezone } from '@/core/timezone/server';
import 'server-only';
import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';
import { getT } from '@/core/i18n/server';
import { listInbox, listTriageInputs } from '@/features/inbox';
import { checkinSnapshot } from '@/features/player-file';
import { localDate } from '@/lib/dates';
import { messages } from '../messages';
import type { QueueItem } from '../model';
import type { Snapshot } from '@/features/player-file';
import { cairoMidnight } from '../time';
import { customFormRows } from './custom-forms';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

const cursorSchema = z.object({ created_at: z.iso.datetime({ offset: true }), id: z.uuid() });
export type Cursor = z.infer<typeof cursorSchema>;
export interface QueuePage { items: QueueItem[]; previous: Record<string, Snapshot>;
  cursor: Cursor | null; renewalCursor: Cursor | null; requestCursor?: Cursor | null; at: string }
export async function loadQueuePage(input: { cursor?: Cursor; renewalCursor?: Cursor; requestCursor?:Cursor; skipRequests?:boolean; skipInbox?: boolean; skipRenewals?: boolean } = {}): Promise<QueuePage> {
  const t = await getT(messages);
  try {
    const parsed = z.object({ cursor: cursorSchema.optional(), renewalCursor: cursorSchema.optional(),
      requestCursor:cursorSchema.optional(),skipRequests:z.boolean().optional(),
      skipInbox: z.boolean().optional(), skipRenewals: z.boolean().optional() }).parse(input);
    const now = new Date();
    const client = await supabaseServer();
    const auth = await client.auth.getClaims();
    if (auth.error || !auth.data?.claims.sub) throw new Error();
    const captain = auth.data.claims.sub;
    const timezone = await getTimezone();
    const end = new Date(now.getTime() + 7 * 86_400_000);
    const renewals = client.from('coach_clients')
      .select('id,player_id,created_at,access_until,profiles!coach_clients_player_id_fkey(full_name)')
      .eq('captain_id', captain).is('archived_at', null).is('frozen_at', null).eq('pending', false)
      .gte('access_until', localDate(now, timezone)).lte('access_until', localDate(end, timezone))
      .order('created_at', { ascending: false }).order('id').limit(50);
    if (parsed.renewalCursor) {
      const c = parsed.renewalCursor;
      renewals.or(`created_at.lt.${c.created_at},and(created_at.eq.${c.created_at},id.gt.${c.id})`);
    }
    const [open, ending,custom] = await Promise.all([
      parsed.skipInbox ? Promise.resolve({ data: [], error: undefined, nextCursor: null }) : listInbox({ status: 'open', limit: 50, cursor: parsed.cursor }),
      parsed.skipRenewals ? Promise.resolve({ data: [], error: null }) : renewals,
      parsed.skipRequests ? Promise.resolve({items:[],cursor:null}) : customFormRows(client,captain,parsed.requestCursor),
    ]);
    if (open.error || ending.error) throw new Error();
    const items: QueueItem[] = [...custom.items,...open.data ?? [], ...(ending.data ?? []).map(row => ({
      kind: 'renewal' as const, id: row.id, player_id: row.player_id, player_name: row.profiles?.full_name ?? t('player'),
      // Ending-soon items begin waiting on entry to the seven-day window, not on roster creation.
      created_at: new Date(cairoMidnight(row.access_until, timezone) - 7 * 86_400_000).toISOString(),
      reviewed_at: null, reply: null, access_until: row.access_until,
    }))];
    const previous: Record<string, Snapshot> = {};
    // Each predecessor is bounded to one row and strictly older than the submitted check-in.
    await Promise.all(items.filter(item => item.kind === 'checkin').map(async item => {
      const result = await client.from('check_ins').select('id,created_at,body_weight_kg,waist_cm,notes')
        .eq('captain_id', captain).eq('player_id', item.player_id).lt('created_at', item.created_at)
        .order('created_at', { ascending: false }).order('id').limit(1);
      if (result.error) throw new Error();
      if (result.data?.[0]) previous[item.id] = checkinSnapshot(result.data[0]);
    }));
    const last = ending.data?.at(-1);
    return { items, previous, cursor: open.nextCursor ?? null,...(captainWorkspaceEnabled() ? {requestCursor:custom.cursor} : {}),
      renewalCursor: ending.data?.length === 50 && last ? { created_at: last.created_at, id: last.id } : null,
      at: now.toISOString() };
  } catch (error) { unstable_rethrow(error); throw new Error(t('error')); }
}

export async function loadQueueReviews() {
  const result = await listInbox({ status: 'reviewed', limit: 50 });
  if (result.error) throw new Error(result.error);
  if (captainWorkspaceEnabled()) {
    const client = await supabaseServer();
    const auth = await client.auth.getClaims();
    if (auth.error || !auth.data?.claims.sub) throw new Error();
    const custom = await customFormRows(client,auth.data.claims.sub,undefined,true);
    return [...(result.data ?? []),...custom.items];
  }
  return result.data ?? [];
}

export async function loadQueueTriage(ids: string[], at: string) {
  const result = await listTriageInputs(ids, at);
  if (result.error) throw new Error(result.error);
  return result.data ?? { history: [], dailyChecks: [] };
}
