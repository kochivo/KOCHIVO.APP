import { describe, expect, it } from 'vitest';
import { pricingCards, pricingDurations, pricingBanner, countdown } from './package-choice';
import { catalogFixture } from './tiers/catalog-fixture';

const now = new Date('2026-11-28T00:00:00Z');
describe('package choice', () => {
  it('prefers a live banner over historical sales and hides paused or unrelated sales', () => {
    const sale = catalogFixture.offers[0];
    if (!sale) throw new Error('Missing sale fixture');
    const ended = { ...sale, id: 'old', ends_at: '2026-11-27T22:00:00Z' };
    expect(pricingBanner({ ...catalogFixture, offers: [ended, sale] }, false, now)?.id).toBe('sale');
    expect(pricingBanner({ ...catalogFixture, offers: [{ ...ended, paused_at: '2026-11-26' }] }, false, now)).toBeNull();
    expect(pricingBanner({ ...catalogFixture, offers: [{ ...sale, package_ids: ['unrelated'] }] }, false, now)).toBeNull();
    expect(pricingBanner({ ...catalogFixture, offers: [ended] }, false, now)?.id).toBe('old');
  });
  it('defaults to the featured middle duration and shows discounted and original prices', () => {
    expect(pricingDurations(catalogFixture).selected).toBe(90);
    const cards = pricingCards(catalogFixture, 90, false, now);
    expect(cards[0]).toMatchObject({ price: 5200, monthly: 1733, listPrice: 6500, offer: { id: 'sale' } });
    expect(pricingCards(catalogFixture, 30, false, now)[0]).toMatchObject({ price: 2500, offer: null });
  });
  it('filters audience and ends at exactly zero with an injected clock', () => {
    const catalog = { ...catalogFixture, offers: catalogFixture.offers.map(o => ({ ...o, for_new: false })) };
    expect(pricingCards(catalog, 90, false, now)[0]?.offer).toBeNull();
    expect(pricingCards(catalog, 90, true, now)[0]?.price).toBe(5200);
    expect(countdown('2026-11-28T00:00:00Z', now.getTime())).toEqual({ ended: true, days: 0, hours: 0 });
    expect(countdown('2026-11-30T14:00:00Z', now.getTime())).toEqual({ ended: false, days: 2, hours: 14 });
  });
});
