import { describe, expect, it } from 'vitest';
import { applicableOffers, bestOffer, finalPrice, monthlyEquivalent, offerStatus, remainingSlots, savingsPercent } from './pricing';
import type { Offer } from './pricing';

const now = new Date('2026-11-12T12:00:00Z');
const offer = (patch: Partial<Offer> = {}): Offer => ({
  id: 'offer', kind: 'percent', value: 20, scope: 'all', tier_ids: [], package_ids: [],
  starts_at: '2026-11-12T12:00:00Z', ends_at: '2026-11-13T12:00:00Z',
  for_new: true, for_renewals: true, max_uses: 20, used_count: 7, paused_at: null, ...patch,
});
const context = { packageId: 'package', tierId: 'tier', isRenewal: false, now };

describe('offer pricing', () => {
  it('rounds whole pounds, floors at zero and does not discount bonus days', () => {
    expect(finalPrice(101, offer({ value: 50 }))).toBe(51);
    expect(finalPrice(101, offer({ kind: 'amount', value: 200 }))).toBe(0);
    expect(finalPrice(101, offer({ kind: 'bonus_days', value: 30 }))).toBe(101);
    expect(finalPrice(101.5, null)).toBe(102);
    expect(finalPrice(50, offer({ value: 55 }))).toBe(23);
  });
  it('uses a thirty-day month and returns safe zero values for invalid durations', () => {
    expect(monthlyEquivalent(3200, 90)).toBe(1067);
    expect(monthlyEquivalent(100, 0)).toBe(0);
    expect(savingsPercent(1500, 4000, 90)).toBe(11);
    expect(savingsPercent(1500, 7500, 180)).toBe(17);
    expect(savingsPercent(0, 4000, 90)).toBe(0);
    expect(savingsPercent(1500, 2000, 30)).toBe(0);
    expect(savingsPercent(1500, 100, 0)).toBe(0);
  });
  it('checks exclusive end, inclusive start, pause and capacity', () => {
    expect(offerStatus(offer(), now)).toBe('running');
    expect(offerStatus(offer({ starts_at: '2026-11-12T12:00:01Z' }), now)).toBe('scheduled');
    expect(offerStatus(offer({ ends_at: now.toISOString() }), now)).toBe('ended');
    expect(offerStatus(offer({ paused_at: now.toISOString() }), now)).toBe('paused');
    expect(offerStatus(offer({ used_count: 20 }), now)).toBe('full');
    expect(remainingSlots(offer())).toBe(13);
    expect(remainingSlots(offer({ used_count: 21 }))).toBe(0);
    expect(remainingSlots(offer({ max_uses: null }))).toBeNull();
  });
  it('matches scopes and new versus renewal eligibility without mutating the list', () => {
    const all = offer(), tier = offer({ id: 'tier', scope: 'tiers', tier_ids: ['tier'] });
    const pkg = offer({ id: 'package', scope: 'packages', package_ids: ['package'], for_new: false });
    const wrong = offer({ scope: 'tiers', tier_ids: ['other'] });
    const offers = [all, tier, pkg, wrong, offer({ used_count: 20 })];
    expect(applicableOffers(offers, context)).toEqual([all, tier]);
    expect(applicableOffers(offers, { ...context, isRenewal: true })).toEqual([all, tier, pkg]);
    expect(applicableOffers([tier], { ...context, tierId: null })).toEqual([]);
    expect(offers).toHaveLength(5);
  });
  it('selects the cheapest applicable price, then the greatest bonus on ties', () => {
    const discount = offer(), cheaper = offer({ id: 'cheaper', kind: 'amount', value: 30 });
    const gift = offer({ id: 'gift', kind: 'bonus_days', value: 30 });
    expect(bestOffer(100, [discount, cheaper, gift], context)).toBe(cheaper);
    expect(bestOffer(0, [discount, gift], context)).toBe(gift);
    expect(bestOffer(100, [gift, offer({ ...gift, value: 60 })], context)?.value).toBe(60);
    expect(bestOffer(100, [], context)).toBeNull();
  });
});
