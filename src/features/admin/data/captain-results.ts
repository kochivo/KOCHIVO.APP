import 'server-only';
import { fetchCaptains } from './captains';
import { fetchCaptainActivity } from './dashboard';
import { filterCaptains } from '../dashboard-ui';
import type { CaptainFilter } from '../dashboard-ui';
import type { AdminCaptainActivity } from '../dashboard-types';
import type { CaptainRow } from '../types';

const batchSize = 100;

export async function fetchCaptainResults({ search, filter, offset = 0, limit }: {
  search: string; filter: CaptainFilter; offset?: number; limit?: number;
}) {
  const rows: CaptainRow[] = [];
  const activity: AdminCaptainActivity[] = [];
  let activityError = false;
  let hasNext = false;
  let skipped = 0;
  const needsActivity = filter === 'expiringSoon' || filter === 'quiet';
  // The RPC applies search and caps each read. Count matches across batches before taking the requested page.
  for (let cursor = filter === 'all' ? offset : 0; ; cursor += batchSize) {
    const batch = await fetchCaptains({ search, limit: batchSize, offset: cursor });
    if (batch.error) return { rows: [], activity: [], error: batch.error, activityError: false, hasNext: false };
    const readActivity = (captains: CaptainRow[]) => fetchCaptainActivity(captains.map(row => row.id));
    const filterActivity = needsActivity && batch.rows.length ? await readActivity(batch.rows) : null;
    if (filterActivity?.error) return { rows: [], activity: [], error: null, activityError: true, hasNext: false };
    const matches = filterCaptains(batch.rows, filter, filterActivity?.data ?? []);
    const start = filter === 'all' ? 0 : Math.max(0, offset - skipped);
    skipped += matches.length;
    const available = matches.slice(start);
    const remaining = limit === undefined ? available.length : limit - rows.length;
    const page = available.slice(0, remaining);
    rows.push(...page);
    if (page.length) {
      const result = filterActivity ?? await readActivity(page);
      activityError ||= !!result.error;
      const ids = new Set(page.map(row => row.id));
      activity.push(...(result.data ?? []).filter(item => ids.has(item.id)));
    }
    hasNext = available.length > page.length;
    if (hasNext || batch.rows.length < batchSize) break;
  }
  return { rows, activity, error: null, activityError, hasNext };
}
