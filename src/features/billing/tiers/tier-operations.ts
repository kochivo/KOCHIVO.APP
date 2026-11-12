import type { Tables } from '@/types/database';
import type { ActionResult } from '../types';

type TierRow = Pick<Tables<'captain_package_tiers'>, 'id' | 'name' | 'description' | 'color' | 'features' | 'position' | 'is_featured'>;
export function tierFields(tier: TierRow) {
  return { id: tier.id, name: tier.name, description: tier.description, color: tier.color, features: tier.features, position: tier.position, is_featured: tier.is_featured };
}

/** Restore successful writes if a later step in a catalog operation fails. */
export async function tierOperation<T>(updates: { before: TierRow; after: TierRow }[],
  save: (input: ReturnType<typeof tierFields>) => Promise<ActionResult<TierRow>>,
  finish: () => Promise<ActionResult<T>>, failure: string): Promise<ActionResult<T>> {
  const saved: TierRow[] = [];
  try {
    for (const update of updates) {
      const result = await save(tierFields(update.after));
      if (result.error !== undefined) throw new Error(result.error);
      saved.push(update.before);
    }
    const result = await finish();
    if (result.error !== undefined) throw new Error(result.error);
    return result;
  } catch (error) {
    for (const previous of saved.reverse()) {
      try { await save(tierFields(previous)); } catch { /* Keep restoring the other completed writes. */ }
    }
    return { error: error instanceof Error ? error.message : failure };
  }
}
