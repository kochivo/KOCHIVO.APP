import type { fetchPackageCatalog } from '@/features/billing/server';
import type { CoachRequestStatus } from '@/lib/coach-request-status';
import { formatNumber } from '@/lib/format';
import type { PublicT } from './public-types';
import { PublicTierCards } from './public-tier-cards';
import { PublicDurationTabs } from './public-duration-tabs';

type Catalog = Awaited<ReturnType<typeof fetchPackageCatalog>>;

export function PublicPackageCards(props: {
  catalog: Catalog; signup: string; requested?: CoachRequestStatus; accepting?: boolean; t: PublicT; now: Date;
}) {
  const { catalog, t } = props;
  const packages = catalog.packages.filter(p => p.kind === 'days' && catalog.tiers.some(tier => tier.id === p.tier_id));
  const durations = [...new Set(packages.map(p => p.days))].sort((a, b) => a - b);
  if (!durations.length) return null;
  const featured = catalog.tiers.find(tier => tier.is_featured) ?? catalog.tiers[0];
  const preferred = durations.filter(days => packages.some(p => p.days === days && p.tier_id === featured?.id));
  const initial = preferred[Math.floor(preferred.length / 2)] ?? durations[0] ?? 30;
  const options = durations.map(days => ({
    days, label: t('packageDays', { count: formatNumber(days) }), content: <PublicTierCards {...props} days={days} />,
  }));
  return <section data-section="packages" id="packs" className="public-section">
    <p className="mb-stack text-sm text-lime">{t('packagesTitle')}</p><h2 className="public-heading">{t('packagesHint')}</h2>
    <PublicDurationTabs options={options} initial={initial} />
    <p className="mt-section text-sm text-muted">{t('paymentNote')}</p>
  </section>;
}
