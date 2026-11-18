import 'server-only';
import { supabaseServer } from '@/core/supabase/server';
import { catalogRpc } from './catalog-rpc';
import { captainClient } from './client';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { getTimezone } from '@/core/timezone/server';
import { localDate } from '@/lib/dates';
import { archivedTierCounts } from '../tiers/archived-tier-counts';
import type { CatalogPackage } from '../tiers/types';
import type { Tables } from '@/types/database';

const tierColumns = 'id,captain_id,name,description,color,position,features,is_featured,archived_at,created_at';
const offerColumns = 'id,captain_id,name,kind,value,scope,tier_ids,package_ids,starts_at,ends_at,for_new,for_renewals,max_uses,used_count,paused_at,created_at';
type PaymentPeriod = Pick<Tables<'player_payments'>, 'player_id' | 'period_start' | 'period_end'>;
type TierHistory = Pick<Tables<'captain_package_tiers'>, 'id' | 'name' | 'archived_at'> & {
  player_payments: PaymentPeriod[];
  captain_packages: { player_payments: PaymentPeriod[] }[];
};

/** RLS exposes the published catalog, or private rows when the owner is signed in. */
export async function fetchPackageCatalog(captainId: string, includeArchivedTierDurations = false) {
  const client = await supabaseServer();
  const [tiers, packages, offers] = await Promise.all([
    client.from('captain_package_tiers').select(tierColumns).eq('captain_id', captainId).is('archived_at', null).order('position').order('id'),
    client.from('captain_packages').select('id,name,price_egp,days,kind,sessions,tier_id,max_freeze_days').eq('captain_id', captainId)
      .is('archived_at', null).order('days').order('id'),
    client.from('captain_offers').select(offerColumns).eq('captain_id', captainId).order('starts_at').order('id'),
  ]);
  if (tiers.error || packages.error || offers.error) throw tiers.error ?? packages.error ?? offers.error;
  const catalogPackages: CatalogPackage[] = packages.data.map(item => ({ ...item, kind: item.kind === 'sessions' ? 'sessions' : 'days' }));
  const visiblePackages = includeArchivedTierDurations || !captainWorkspaceEnabled() ? catalogPackages
    : catalogPackages.filter(item => !item.tier_id || tiers.data.some(tier => tier.id === item.tier_id));
  return { tiers: tiers.data, packages: visiblePackages, offers: offers.data };
}

export async function fetchCaptainPackageCatalog(now = new Date()) {
  const { client, captainId } = await captainClient();
  if (!captainWorkspaceEnabled()) return fetchPackageCatalog(captainId);
  const [catalog, history, deletable, timezone] = await Promise.all([
    fetchPackageCatalog(captainId, true),
    client.from('captain_package_tiers')
      .select('id,name,archived_at,player_payments!player_payments_tier_id_fkey(player_id,period_start,period_end),captain_packages!package_tier_owner(player_payments!player_payments_package_id_fkey(player_id,period_start,period_end))')
      .eq('captain_id', captainId)
      .is('captain_packages.player_payments.tier_id', null)
      .order('archived_at', { ascending: false }).order('id')
      .overrideTypes<TierHistory[], { merge: false }>(),
    // Migration 0153 adds package_tier_deletable; until it is applied, nothing is deletable and the page still loads.
    client.from('captain_package_tiers').select('id,package_tier_deletable').eq('captain_id', captainId).not('archived_at', 'is', null)
      .overrideTypes<{ id: string; package_tier_deletable: boolean }[], { merge: false }>(),
    getTimezone(),
  ]);
  if (history.error) throw history.error;
  const today = localDate(now, timezone);
  const canDelete = new Set(deletable.error ? [] : deletable.data.filter(row => row.package_tier_deletable).map(row => row.id));
  const currentCounts: Record<string, number> = {};
  const archivedTiers = history.data.flatMap(tier => {
    const counts = archivedTierCounts([...tier.player_payments, ...tier.captain_packages.flatMap(item => item.player_payments)], today);
    currentCounts[tier.id] = counts.current;
    return tier.archived_at ? [{ id: tier.id, name: tier.name, archived_at: tier.archived_at, canDelete: canDelete.has(tier.id), ...counts }] : [];
  });
  return { ...catalog, archivedTiers, currentCounts };
}

/** Includes unpublished tiers only for the owning player or their current captain. */
export async function fetchPlayerTier(playerId: string) {
  const client = await supabaseServer();
  const { data, error } = await catalogRpc(client)('player_package_tier', { p_player: playerId });
  if (error) throw error;
  return data?.[0] ?? null;
}
