'use server';
import 'server-only';
import { supabaseServer } from '@/core/supabase/server';
import { getTimezone } from '@/core/timezone/server';
import { getLocale } from '@/core/i18n/server';
import { fetchRoster } from '@/features/roster/server';
import { fetchPendingPaymentReceipts } from '@/features/billing/server';
import { exerciseName } from '@/lib/display-name';
import { buildTasks, contactedTasks } from '../tasks-model';
import type { SwapTask } from '../tasks-model';
import { loadQueuePage, loadQueueTriage } from './page';

export async function loadTasks(at?: string) {
  const client = await supabaseServer();
  const auth = await client.auth.getClaims();
  if (auth.error || !auth.data?.claims.sub) throw new Error('Unauthenticated');
  const captainId = auth.data.claims.sub;
  const [roster, first, timezone, locale, receipts] = await Promise.all([
    fetchRoster(), loadQueuePage(), getTimezone(), getLocale(), fetchPendingPaymentReceipts(),
  ]);
  if (roster.error || !roster.players) throw new Error(roster.error);
  const items = [...first.items];
  let page = first;
  while (page.cursor || page.requestCursor) {
    page = await loadQueuePage({ cursor: page.cursor ?? undefined, requestCursor: page.requestCursor ?? undefined,
      skipRenewals: true, skipInbox: !page.cursor, skipRequests: !page.requestCursor });
    items.push(...page.items);
  }
  const swaps: SwapTask[] = [];
  // PostgREST caps response sizes; paginate so tab counts cover the whole queue.
  for (let offset = 0; ; offset += 500) {
    const result = await client.from('exercise_swap_requests').select(`id,player_id,created_at,
      from:exercises!exercise_swap_requests_from_exercise_id_fkey(name_ar,name_en),
      to:exercises!exercise_swap_requests_to_exercise_id_fkey(name_ar,name_en)`)
      .eq('captain_id', captainId).eq('status', 'pending').order('created_at').order('id').range(offset, offset + 499);
    if (result.error) throw result.error;
    swaps.push(...result.data.map(row => ({ ...row, from: exerciseName(row.from ?? {}, locale), to: exerciseName(row.to ?? {}, locale) })));
    if (result.data.length < 500) break;
  }
  const triage = await loadQueueTriage([...new Set(items.filter(item => item.kind === 'checkin').map(item => item.player_id))], first.at);
  const snapshotAt = at ?? first.at;
  const tasks = buildTasks(items, roster.players, swaps, new Date(snapshotAt), timezone, receipts);
  const contacts: Record<string, string> = {};
  await Promise.all([...new Set(tasks.filter(task => task.kind === 'absent' || task.kind === 'renew').map(task => task.playerId))].map(async playerId => {
    const result = await client.from('chat_messages').select('created_at').eq('captain_id', captainId)
      .eq('sender_id', captainId).eq('player_id', playerId).order('created_at', { ascending: false }).limit(1);
    if (result.error) throw result.error;
    if (result.data[0]) contacts[playerId] = result.data[0].created_at;
  }));
  return { tasks: contactedTasks(tasks, contacts, timezone), triage, at: snapshotAt, captainId };
}
