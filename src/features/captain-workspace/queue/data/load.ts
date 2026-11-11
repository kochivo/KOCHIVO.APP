import { loadQueuePage, loadQueueReviews, loadQueueTriage } from './page';
import type { QueuePage } from './page';
import type { InboxItem, TriageInputs } from '@/features/inbox';
import { loadQueueCounts } from './counts';
export interface QueueData { pages: QueuePage[]; reviews: InboxItem[]; triage: TriageInputs; counts: Awaited<ReturnType<typeof loadQueueCounts>>; at?: string }
export function mergeQueuePage(current: QueueData | undefined, result: QueueData): QueueData {
  if (!current) return result;
  if (current.pages[0]?.at !== result.pages[0]?.at) return current;
  return { ...current, pages: result.pages, triage: result.triage };
}
export async function loadQueue(): Promise<QueueData> {
  const [page, reviews] = await Promise.all([loadQueuePage(), loadQueueReviews()]);
  const ids = [...new Set([...page.items, ...reviews].filter(item => item.kind === 'checkin').map(item => item.player_id))];
  const [triage, counts] = await Promise.all([loadQueueTriage(ids, page.at), loadQueueCounts(page.at)]);
  return { pages: [page], reviews, triage, counts, at: page.at };
}
export async function moreQueue(data: QueueData): Promise<QueueData> {
  const last = data.pages.at(-1);
  if (!last || (!last.cursor && !last.renewalCursor)) return data;
  const page = await loadQueuePage({ cursor: last.cursor ?? undefined, renewalCursor: last.renewalCursor ?? undefined,
    skipInbox: !last.cursor, skipRenewals: !last.renewalCursor });
  const ids = [...new Set(page.items.filter(item => item.kind === 'checkin').map(item => item.player_id))];
  const extra = await loadQueueTriage(ids, page.at);
  return { ...data, pages: [...data.pages, page], triage: {
    history: [...new Map([...data.triage.history, ...extra.history].map(row => [row.id, row])).values()],
    dailyChecks: [...new Map([...data.triage.dailyChecks, ...extra.dailyChecks].map(row => [`${row.player_id}:${row.log_date}`, row])).values()],
  } };
}
