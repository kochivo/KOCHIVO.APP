import { applyOptimistic } from '@/lib/optimistic';

export type SaveState = 'saved' | 'saving' | 'error';
export async function savePreference<T>(previous: T, next: T, update: (value: T) => void,
  status: (value: SaveState) => void, commit: () => Promise<{ data?: T; error?: string }>) {
  status('saving');
  try {
    await applyOptimistic(previous, { apply: () => update(next), rollback: update,
      reconcile: result => { if (result.data) update(result.data); } }, async () => {
      const result = await commit();
      if (result.error) throw new Error(result.error);
      return result;
    });
    status('saved');
  } catch (error) { status('error'); throw error; }
}
