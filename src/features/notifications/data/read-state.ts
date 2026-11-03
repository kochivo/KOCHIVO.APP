import type { ReadState } from '../types';

export async function markOptimistically(
  previous: ReadState, id: string | undefined, publish: (state: ReadState) => void,
  persist: () => Promise<void>,
): Promise<boolean> {
  const decrement = previous.rows.filter(row => !row.is_read && row.id === id).length;
  publish({ rows: previous.rows.map(row => !id || row.id === id ? { ...row, is_read: true } : row),
    count: id ? Math.max(0, previous.count - decrement) : 0 });
  try {
    await persist();
    return true;
  } catch {
    publish(previous);
    return false;
  }
}
