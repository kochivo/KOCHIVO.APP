import type { Catalog, Tier } from './types';

export function archiveTier(catalog: Catalog, tier: Tier, count: number, archivedAt: string): Catalog {
  return {
    ...catalog,
    tiers: catalog.tiers.filter(row => row.id !== tier.id),
    archivedTiers: [{ id: tier.id, name: tier.name, archived_at: archivedAt, current: count, past: 0 }, ...(catalog.archivedTiers ?? [])],
  };
}
