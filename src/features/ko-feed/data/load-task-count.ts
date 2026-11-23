/**
 * The pending-task count the KO launcher badge shows (T-429). This is the same
 * count the queue, the dashboard and the sidebar show: `loadTasks()` on the
 * server, exposed to the client by `GET /[locale]/api/captain/task-count`.
 * The KO feed counts a different set (today's workout, the captain's own
 * expiry, inactive players without the queue's contacted filter) and misses
 * queue kinds entirely, so the badge must not derive from feed rows.
 * Returns null when the count is unknown; callers keep their last good count.
 */
export async function loadTaskCount(locale: string, fetcher: typeof fetch = fetch): Promise<number | null> {
  try {
    const response = await fetcher(`/${locale}/api/captain/task-count`, { cache: 'no-store' });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (typeof data !== 'object' || data === null || !('count' in data)) return null;
    const count = (data as { count: unknown }).count;
    return typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 ? count : null;
  } catch {
    return null;
  }
}
