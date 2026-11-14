import { bestOffer, finalPrice, monthlyEquivalent, offerStatus } from './pricing';
import type { CatalogOffer, CatalogPackage, Tier } from './tiers/types';
import type { Locale } from '@/core/i18n/locale';

export const durationPresets = [30, 90, 180, 365] as const;
type Duration = Pick<CatalogPackage, 'kind' | 'days' | 'sessions' | 'tier_id'> & { id?: string };
export function duplicateDuration(packages: CatalogPackage[], item: Duration) {
  return item.tier_id !== null && packages.some(p => p.id !== item.id && p.tier_id === item.tier_id
    && p.kind === item.kind && (item.kind === 'days' ? p.days === item.days : p.sessions === item.sessions));
}
export function firstUnusedDuration(packages: CatalogPackage[], tierId: string, id?: string) {
  return durationPresets.find(days => !duplicateDuration(packages, { id, tier_id: tierId || null, kind: 'days', days, sessions: null })) ?? null;
}
export function durationLabel(days: number, t: (key: 'month' | 'months' | 'days' | 'year', values?: Record<string, string>) => string, locale: Locale) {
  if (days === 30) return t('month');
  if (days === 365) return t('year');
  const count = (days % 30 === 0 ? days / 30 : days).toLocaleString(locale === 'en' ? 'en-US' : 'ar-EG');
  return t(days % 30 === 0 ? 'months' : 'days', { n: count, count });
}
export type PricingCatalog = { tiers: Tier[]; packages: CatalogPackage[]; offers: CatalogOffer[] };
export function pricingBanner(catalog: PricingCatalog, isRenewal: boolean, now: Date) {
  const candidates = catalog.offers.filter(o => (isRenewal ? o.for_renewals : o.for_new)
    && catalog.packages.some(p => p.kind === 'days' && (o.scope === 'all'
      || (o.scope === 'packages' && o.package_ids.includes(p.id))
      || (o.scope === 'tiers' && p.tier_id !== null && o.tier_ids.includes(p.tier_id)))));
  return candidates.find(o => offerStatus(o, now) === 'running')
    ?? candidates.filter(o => offerStatus(o, now) === 'ended')
      .sort((a, b) => Date.parse(b.ends_at) - Date.parse(a.ends_at))[0] ?? null;
}
export function pricingDurations(catalog: PricingCatalog) {
  const durations = [...new Set(catalog.packages.filter(p => p.kind === 'days').map(p => p.days))].sort((a, b) => a - b);
  const featured = catalog.tiers.find(t => t.is_featured) ?? catalog.tiers[0];
  const preferred = durations.filter(d => catalog.packages.some(p => p.tier_id === featured?.id && p.kind === 'days' && p.days === d));
  return { durations, selected: preferred[Math.floor(preferred.length / 2)] ?? durations[0] ?? 30 };
}
export function pricingCards(catalog: PricingCatalog, days: number, isRenewal: boolean, now: Date) {
  const features = [...new Set(catalog.tiers.flatMap(t => t.features))];
  return catalog.tiers.flatMap(tier => {
    const pkg = catalog.packages.find(p => p.tier_id === tier.id && p.kind === 'days' && p.days === days);
    if (!pkg) return [];
    const offer = bestOffer(pkg.price_egp, catalog.offers, { packageId: pkg.id, tierId: tier.id, isRenewal, now });
    const price = finalPrice(pkg.price_egp, offer);
    return [{ tier, pkg, offer, price, listPrice: pkg.price_egp, monthly: monthlyEquivalent(price, days),
      features: [...tier.features.map(text => ({ text, included: true })),
        ...features.filter(text => !tier.features.includes(text)).map(text => ({ text, included: false }))] }];
  });
}
export function countdown(endsAt: string, now: number) {
  const remaining = Math.max(0, Date.parse(endsAt) - now);
  return { ended: remaining === 0, days: Math.floor(remaining / 86_400_000), hours: Math.floor(remaining / 3_600_000) % 24 };
}
