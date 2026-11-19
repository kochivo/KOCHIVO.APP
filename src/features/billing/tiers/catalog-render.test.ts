import { createElement } from 'react';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { TierCard } from './tier-card';
import { OffersCard } from '../offers/offers-card';
import { OfferPreview } from '../offers/offer-preview';
import { offerDraft } from '../offers/offer-form';
import { catalogFixture as catalog } from './catalog-fixture';

const noop = () => {};
function render(child: ReactNode) { return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, child)); }
it('renders calculated savings, featured tier, player count and duration controls', () => {
  const tier = catalog.tiers[0];
  if (!tier) throw new Error('Missing tier fixture');
  const html = render(createElement(TierCard, { tier, packages: catalog.packages, count: 4, busy: false, onEdit: noop, onFeature: noop, onMove: noop, onArchive: noop, onPackage: noop }));
  expect(html).toContain('وفّر 13%');
  expect(html).toContain('الأكثر طلبًا');
  expect(html).toContain('4 لاعبين عليها');
  expect(html).toContain('+ مدة');
  expect(html).toContain('Weekly call');
});
it('renders actual running, scheduled, paused, ended and full status pills', () => {
  const offer = catalog.offers[0];
  if (!offer) throw new Error('Missing offer fixture');
  const now = new Date('2026-11-28T12:00:00Z');
  const data = { ...catalog, offers: [offer,
    { ...offer, id: 'scheduled', starts_at: '2026-12-01T00:00:00Z' },
    { ...offer, id: 'paused', paused_at: now.toISOString() },
    { ...offer, id: 'ended', ends_at: '2026-11-27T00:00:00Z' },
    { ...offer, id: 'full', used_count: 20 }] };
  const html = render(createElement(OffersCard, { catalog: data, now, busy: false, onEdit: noop, onPause: noop, onNew: noop }));
  for (const status of ['شغال', 'متجدول', 'متوقف', 'خلص', 'العدد خلص', 'استخدمه 7 من 20']) expect(html).toContain(status);
  expect(html).toContain('وقّفه');
  expect(html).toContain('شغّله');
});
it('previews the eligible package with finalPrice and remaining places', () => {
  const now = new Date('2026-11-28T12:00:00Z');
  const offer = catalog.offers[0];
  if (!offer) throw new Error('Missing offer fixture');
  const html = render(createElement(OfferPreview, { draft: offerDraft(now, 'Africa/Cairo', offer), catalog, now, used: 7 }));
  expect(html).toContain('5,200');
  expect(html).toContain('6,500');
  expect(html).toContain('فاضل 13 مكان');
  expect(html).toContain('VIP');
});
