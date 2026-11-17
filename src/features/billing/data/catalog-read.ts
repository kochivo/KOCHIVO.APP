import 'server-only';
import { supabaseServer } from '@/core/supabase/server';
import { catalogRpc } from './catalog-rpc';
import { captainClient } from './client';
import type { CatalogPackage } from '../tiers/types';

const tierColumns = 'id,captain_id,name,description,color,position,features,is_featured,archived_at,created_at';
const offerColumns = 'id,captain_id,name,kind,value,scope,tier_ids,package_ids,starts_at,ends_at,for_new,for_renewals,max_uses,used_count,paused_at,created_at';

/** RLS exposes the published catalog, or private rows when the owner is signed in. */
export async function fetchPackageCatalog(captainId: string) {
  const client = await supabaseServer();
  const [tiers, packages, offers] = await Promise.all([
    client.from('captain_package_tiers').select(tierColumns).eq('captain_id', captainId).is('archived_at', null).order('position').order('id'),
    client.from('captain_packages').select('id,name,price_egp,days,kind,sessions,tier_id,max_freeze_days').eq('captain_id', captainId)
      .is('archived_at', null).order('days').order('id'),
    client.from('captain_offers').select(offerColumns).eq('captain_id', captainId).order('starts_at').order('id'),
  ]);
  if (tiers.error || packages.error || offers.error) throw tiers.error ?? packages.error ?? offers.error;
  const catalogPackages: CatalogPackage[] = packages.data.map(item => ({ ...item, kind: item.kind === 'sessions' ? 'sessions' : 'days' }));
  return { tiers: tiers.data, packages: catalogPackages, offers: offers.data };
}

export async function fetchCaptainPackageCatalog() {
  const { captainId } = await captainClient();
  return fetchPackageCatalog(captainId);
}

/** Includes unpublished tiers only for the owning player or their current captain. */
export async function fetchPlayerTier(playerId: string) {
  const client = await supabaseServer();
  const { data, error } = await catalogRpc(client)('player_package_tier', { p_player: playerId });
  if (error) throw error;
  return data?.[0] ?? null;
}
