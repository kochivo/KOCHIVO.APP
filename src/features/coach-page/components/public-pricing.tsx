import 'server-only';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { fetchPackageCatalog } from '@/features/billing/server';
import { PricingEntry } from '@/features/billing';

export async function PublicPricing({ captainId, name, signup }: { captainId: string; name: string; signup: string }) {
  if (!captainWorkspaceEnabled()) return null;
  const catalog = await fetchPackageCatalog(captainId);
  if (!catalog.packages.length) return null;
  const tiers = catalog.tiers.map(t => ({ ...t, features: Array.isArray(t.features) ? t.features.filter((f): f is string => typeof f === 'string') : [] }));
  return <PricingEntry name={name} signup={signup} now={new Date().toISOString()} catalog={{ ...catalog, tiers }} />;
}
