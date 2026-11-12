'use server';
import { unstable_rethrow } from 'next/navigation';
import { getT } from '@/core/i18n/server';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { captainClient } from './client';
import { fetchCaptainPackageCatalog } from './catalog-read';
import { messages } from '../tiers/messages';
import type { Catalog } from '../tiers/types';
import type { ActionResult } from '../types';

export async function loadTiersWorkspace(): Promise<ActionResult<Catalog>> {
  const t = await getT(messages);
  if (!captainWorkspaceEnabled()) return { error: t('loadFailed') };
  try {
    const { client, captainId } = await captainClient();
    const [catalog, profile, latest] = await Promise.all([
      fetchCaptainPackageCatalog(),
      client.from('profiles').select('public_slug').eq('id', captainId).single(),
      client.rpc('captain_last_payments'),
    ]);
    if (profile.error || latest.error) throw profile.error ?? latest.error;
    const ids = latest.data.map(payment => payment.id);
    const payments = ids.length ? await client.from('player_payments').select('tier_id,package_id').eq('captain_id', captainId).in('id', ids)
      : { data: [], error: null };
    if (payments.error) throw payments.error;
    const counts: Record<string, number> = {};
    const packageTiers = new Map(catalog.packages.map(item => [item.id, item.tier_id]));
    for (const payment of payments.data) {
      const tierId = payment.tier_id ?? (payment.package_id ? packageTiers.get(payment.package_id) : null);
      if (tierId) counts[tierId] = (counts[tierId] ?? 0) + 1;
    }
    return { data: { ...catalog,
      tiers: catalog.tiers.map(tier => ({ ...tier, features: Array.isArray(tier.features) ? tier.features.filter((value): value is string => typeof value === 'string') : [] })),
      packages: catalog.packages.map(item => ({ ...item, kind: item.kind === 'sessions' ? 'sessions' : 'days' })),
      counts, publicSlug: profile.data.public_slug } };
  } catch (error) { unstable_rethrow(error); return { error: t('loadFailed') }; }
}
