import { expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createT } from '@/core/i18n/messages';
import type { fetchPackageCatalog } from '@/features/billing/server';
import { messages } from './messages';
import { PublicPackageCards } from './components/public-package-cards';
import { PublicPackages } from './components/public-packages';

vi.mock('server-only', () => ({}));
vi.mock('@/features/billing/server', () => ({ fetchPackageCatalog: async () => ({ tiers: [], packages: [], offers: [] }) }));
type Catalog = Awaited<ReturnType<typeof fetchPackageCatalog>>;
const t = createT(messages, 'en');
const now = new Date('2026-11-13T12:00:00Z');
const catalog: Catalog = {
  tiers: [{ id: 'vip', captain_id: 'coach', name: 'VIP', description: '', color: 'lime', position: 0,
    features: ['Weekly review'], is_featured: true, archived_at: null, created_at: '2026-01-01T00:00:00Z' }],
  packages: [{ id: 'month', name: 'Month', days: 30, kind: 'days', sessions: null, price_egp: 1000, tier_id: 'vip' }],
  offers: [{ id: 'sale', captain_id: 'coach', name: 'November offer', kind: 'percent', value: 20, scope: 'all',
    tier_ids: [], package_ids: [], starts_at: '2026-11-01T00:00:00Z', ends_at: '2026-12-01T00:00:00Z',
    for_new: true, for_renewals: true, max_uses: null, used_count: 0, paused_at: null, created_at: '2026-11-01T00:00:00Z' }],
};
const render = (data = catalog, requested?: 'sent' | 'member' | 'linked') => renderToStaticMarkup(createElement(PublicPackageCards, {
  catalog: data, signup: '/login?tab=signup&coach=ahmed', t, now, requested,
}));
it('hides an unpublished or empty catalog', async () => {
  expect(render({ tiers: [], packages: [], offers: [] })).toBe('');
  expect(render({ ...catalog, packages: [] })).toBe('');
  expect(renderToStaticMarkup(await PublicPackages({ captainId: 'coach', signup: '/login', t, now }))).toBe('');
});
it('keeps the featured badge next to the tier name, features inside, and applies billing offers', () => {
  const html = render();
  expect(html).toMatch(/VIP<\/h3><span[^>]*>Most popular<\/span><\/div>/);
  expect(html).toContain('glass-featured');
  expect(html).toContain('>800</b>');
  expect(html).toContain('>1,000</s>');
  expect(html).toContain('Weekly review</li>');
  expect(html).toContain('name="package" value="month"');
  expect(html).toContain('name="offer" value="sale"');
});
it('limits cards to three visible tiers in catalog order', () => {
  const tiers = Array.from({ length: 5 }, (_, i) => ({ ...catalog.tiers[0], id: `tier-${i}`, name: `Tier ${i}` }));
  // The fixture always contains a tier and package.
  const data = { ...catalog, tiers, packages: tiers.map(tier => ({ ...catalog.packages[0], tier_id: tier.id })) } as Catalog;
  const html = render(data);
  expect(html.match(/<article/g)).toHaveLength(3);
  expect(html.indexOf('Tier 0')).toBeLessThan(html.indexOf('Tier 1'));
  expect(html).not.toContain('Tier 3');
});
it.each(['sent', 'member', 'linked'] as const)('keeps pricing but removes package signup for %s', status => {
  const html = render(catalog, status);
  expect(html).toContain('VIP');
  expect(html).not.toContain('<form');
});
it('uses regular prices when an offer has expired', () => {
  const html = render({ ...catalog, offers: catalog.offers.map(offer => ({ ...offer, ends_at: '2026-11-12T00:00:00Z' })) });
  expect(html).toContain('>1,000</b>');
  expect(html).not.toContain('name="offer"');
});
it('retains every published duration and selects the middle duration for the featured tier', () => {
  const html = render({ ...catalog, packages: [...catalog.packages,
    { ...catalog.packages[0], id: 'quarter', days: 90, price_egp: 2400 } as Catalog['packages'][number],
  ] });
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('90 days');
  expect(html).toContain('name="package" value="quarter"');
});
