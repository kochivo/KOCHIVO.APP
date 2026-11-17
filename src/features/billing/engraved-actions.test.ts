import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { PackagesCard } from './components/packages-card';

vi.mock('./data/finance-actions', () => ({ archivePackage: vi.fn(), createPackage: vi.fn() }));
afterEach(() => vi.unstubAllEnvs());

it.each(['0', '1'])('gates the new package icon with flag %s and retains archive controls', flag => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', flag);
  const html = renderToStaticMarkup(createElement(PackagesCard, {
    packages: [{ id: 'p', name: 'Monthly', price_egp: 300, days: 30 }], onChange() {},
  }));
  expect(html.includes('<pattern')).toBe(flag === '1');
  expect(html.includes('lucide-plus')).toBe(flag === '0');
  expect(html).toContain('lucide-x');
  expect(html).toContain('aria-label=');
});
vi.mock('./data/freeze-settings', () => ({ loadFreezeSettings: vi.fn(), saveFreezeSettings: vi.fn() }));
