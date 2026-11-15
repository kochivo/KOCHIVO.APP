import { Check } from 'lucide-react';
import { bestOffer, finalPrice } from '@/features/billing';
import { formatNumber } from '@/lib/format';
import type { fetchPackageCatalog } from '@/features/billing/server';
import type { CoachRequestStatus } from '@/lib/coach-request-status';
import type { PublicT } from './public-types';
import { PublicSignup } from './public-signup';

type Catalog = Awaited<ReturnType<typeof fetchPackageCatalog>>;

export function PublicTierCards({ catalog, signup, requested, t, now, days }: {
  catalog: Catalog; signup: string; requested?: CoachRequestStatus; t: PublicT; now: Date; days: number;
}) {
  const cards = catalog.tiers.flatMap(tier => {
    const pkg = catalog.packages.find(p => p.tier_id === tier.id && p.kind === 'days' && p.days === days);
    if (!pkg) return [];
    const offer = bestOffer(pkg.price_egp, catalog.offers, { packageId: pkg.id, tierId: tier.id, isRenewal: false, now });
    return [{ tier, pkg, offer, price: finalPrice(pkg.price_egp, offer) }];
  }).slice(0, 3);
  if (!cards.length) return null;
  return <div className="grid items-stretch gap-section md:grid-cols-3">{cards.map(({ tier, pkg, offer, price }) => {
      const features = Array.isArray(tier.features) ? tier.features.filter((f): f is string => typeof f === 'string') : [];
      const href = `${signup}&package=${encodeURIComponent(pkg.id)}${offer ? `&offer=${encodeURIComponent(offer.id)}` : ''}`;
      return <article key={tier.id} className={`${tier.is_featured ? 'glass-featured' : 'glass'} flex flex-col gap-card-gap rounded-card p-section`}>
        <div className="flex flex-wrap items-center gap-stack"><h3 className="text-xl font-bold">{tier.name}</h3>
          {tier.is_featured && <span className="rounded-full bg-lime px-stack py-inline text-xs font-bold text-on-lime">{t('popular')}</span>}
        </div>
        {tier.description && <p className="text-sm text-muted">{tier.description}</p>}
        <div className="glass-strong rounded-control p-card">
          <p className="flex flex-wrap items-baseline gap-inline"><b className="font-display text-4xl font-extrabold tabular-nums">{formatNumber(price)}</b><span className="text-sm text-muted">{t('currency')}</span>
            {price < pkg.price_egp && <s className="text-sm text-muted">{formatNumber(pkg.price_egp)}</s>}
          </p><p className="mt-inline text-sm text-muted">{t('packageDays', { count: formatNumber(pkg.days) })}</p>
        </div>
        {offer && <p className="text-sm text-lime">{offer.kind === 'bonus_days' ? t('bonusOfferLabel', { name: offer.name, count: formatNumber(offer.value) }) : offer.name}</p>}
        {features.length > 0 && <ul className="flex-1 space-y-stack border-t border-line-soft pt-card text-sm text-muted">{features.map((feature, index) =>
          <li key={`${index}-${feature}`} className="flex items-start gap-inline"><Check aria-hidden strokeWidth={1.5} className="mt-inline size-4 shrink-0 text-lime" />{feature}</li>)}</ul>}
        {!requested && <div className="mt-auto"><PublicSignup href={href} label={t('requestPackage')} secondary /></div>}
      </article>;
    })}</div>;
}
