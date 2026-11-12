import type { Tables } from '@/types/database';

export type Offer = Pick<Tables<'captain_offers'>,
  'id' | 'kind' | 'value' | 'scope' | 'tier_ids' | 'package_ids' | 'starts_at' | 'ends_at'
  | 'for_new' | 'for_renewals' | 'max_uses' | 'used_count' | 'paused_at'>;
export type OfferContext = { packageId: string; tierId: string | null; isRenewal: boolean; now: Date };

export function remainingSlots(offer: Pick<Offer, 'max_uses' | 'used_count'>): number | null {
  return offer.max_uses === null ? null : Math.max(0, offer.max_uses - offer.used_count);
}

export function offerStatus(offer: Offer, now: Date): 'scheduled' | 'running' | 'ended' | 'paused' | 'full' {
  if (offer.paused_at !== null) return 'paused';
  if (now.getTime() >= Date.parse(offer.ends_at)) return 'ended';
  if (remainingSlots(offer) === 0) return 'full';
  return now.getTime() < Date.parse(offer.starts_at) ? 'scheduled' : 'running';
}

export function applicableOffers<T extends Offer>(offers: readonly T[], context: OfferContext): T[] {
  return offers.filter(offer => offerStatus(offer, context.now) === 'running'
    && (context.isRenewal ? offer.for_renewals : offer.for_new)
    && (offer.scope === 'all' || (offer.scope === 'packages' && offer.package_ids.includes(context.packageId))
      || (offer.scope === 'tiers' && context.tierId !== null && offer.tier_ids.includes(context.tierId))));
}

export function finalPrice(listPrice: number, offer: Pick<Offer, 'kind' | 'value'> | null): number {
  const price = offer?.kind === 'percent' ? listPrice * (100 - offer.value) / 100
    : offer?.kind === 'amount' ? listPrice - offer.value : listPrice;
  return Math.max(0, Math.round(price + Number.EPSILON * Math.max(1, Math.abs(price))));
}

export function bestOffer<T extends Offer>(listPrice: number, offers: readonly T[], context: OfferContext): T | null {
  return applicableOffers(offers, context).reduce<T | null>((best, candidate) => {
    if (best === null) return candidate;
    const difference = finalPrice(listPrice, candidate) - finalPrice(listPrice, best);
    const bonus = (offer: Offer) => offer.kind === 'bonus_days' ? offer.value : 0;
    return difference < 0 || (difference === 0 && bonus(candidate) > bonus(best)) ? candidate : best;
  }, null);
}

export function monthlyEquivalent(price: number, days: number): number {
  return days > 0 ? Math.max(0, Math.round(price * 30 / days)) : 0;
}

export function savingsPercent(monthPrice: number, price: number, days: number): number {
  return monthPrice > 0 && days > 0 ? Math.max(0, Math.round((1 - price * 30 / days / monthPrice) * 100)) : 0;
}
