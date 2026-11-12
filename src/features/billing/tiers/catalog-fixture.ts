import type { Catalog } from './types';

export const catalogFixture: Catalog = {
  publicSlug: 'ali', counts: { vip: 4 },
  tiers: [{ id: 'vip', captain_id: 'captain', name: 'VIP', description: '', color: 'lime', position: 0,
    features: ['Weekly call'], is_featured: true, archived_at: null, created_at: '2026-01-01T00:00:00Z' }],
  packages: [{ id: 'month', name: 'Month', days: 30, kind: 'days', sessions: null, price_egp: 2500, tier_id: 'vip' },
    { id: 'quarter', name: 'Quarter', days: 90, kind: 'days', sessions: null, price_egp: 6500, tier_id: 'vip' }],
  offers: [{ id: 'sale', captain_id: 'captain', name: 'بلاك فرايداي', kind: 'percent', value: 20, scope: 'packages',
    tier_ids: [], package_ids: ['quarter'], starts_at: '2026-11-27T00:00:00Z', ends_at: '2026-11-30T22:00:00Z',
    for_new: true, for_renewals: true, max_uses: 20, used_count: 7, paused_at: null, created_at: '2026-11-12T00:00:00Z' }],
};
