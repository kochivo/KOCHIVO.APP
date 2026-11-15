import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { RamadanHome } from './components/ramadan-home';
vi.mock('@/features/readiness', () => ({ readDailyCheck: vi.fn(), saveDailyCheck: vi.fn() }));
vi.mock('@/core/offline', () => ({ localDb: vi.fn(), useLiveQuery: () => 750 }));
const status = { active: true, training: 'after_iftar_2h' as const, intensity: 'lighter_20' as const,
  water_ml: 3000, city: 'cairo', timezone: 'Africa/Cairo' };
it('renders the iftar clock, timeline and water only when active', () => {
  const props = { status, now: new Date('2027-02-08T14:00:00Z'), playerId: 'player', duration: 45 };
  const html = renderToStaticMarkup(createElement(RamadanHome, props));
  for (const text of ['رمضان', 'يومك', 'شربت كوباية', 'glass-strong']) expect(html).toContain(text);
  expect(renderToStaticMarkup(createElement(RamadanHome, { ...props, status: { ...status, active: false } }))).toBe('');
});
