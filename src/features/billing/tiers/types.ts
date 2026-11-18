import type { Tables } from '@/types/database';
export type Tier = Omit<Tables<'captain_package_tiers'>, 'features'> & { features: string[] };
export type CatalogOffer = Tables<'captain_offers'>;
export type CatalogPackage = Pick<Tables<'captain_packages'>, 'id' | 'name' | 'price_egp' | 'days' | 'sessions' | 'tier_id'> & { kind: 'days' | 'sessions'; max_freeze_days?: number | null };
export type ArchivedTier = {
  id: string; name: string; archived_at: string;
  current: number; past: number; canDelete?: boolean;
};
export type Catalog = { tiers: Tier[]; archivedTiers?: ArchivedTier[]; currentCounts?: Record<string, number>;
  offers: CatalogOffer[]; packages: CatalogPackage[]; counts: Record<string, number>; publicSlug: string | null };
