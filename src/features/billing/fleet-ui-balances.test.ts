import { createElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { PlayerBalance } from './pt-types';
import { BillingManagerCard } from './components/billing-manager-card';

const state = vi.hoisted(() => ({ index: 0, values: [] as unknown[] }));
vi.mock('react', async original => ({ ...await original<typeof React>(), useState: (initial: unknown) => {
  const i = state.index++;
  return [i in state.values ? state.values[i] : initial, () => {}];
} }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('./data/pt-actions', () => ({ loadPlayerBalance: vi.fn(), activatePlayer: vi.fn(), setPlayerFrozen: vi.fn() }));
vi.mock('./data/billing', () => ({ renewPlayer: vi.fn() }));
beforeEach(() => { state.index = 0; state.values = []; });
const balance: PlayerBalance = { id: 'link', access_until: '2026-12-05', sessions_left: null, frozen_at: null, pending: false };
function render(locale: 'ar' | 'en', value?: PlayerBalance, error = '') {
  state.index = 0;
  state.values = [value ? { balance: value, packages: [] } : undefined, error];
  return renderToStaticMarkup(createElement(LocaleProvider, { locale },
    createElement(BillingManagerCard, { playerId: 'player', name: 'Ali', today: '2026-11-05' })));
}
it.each(['ar', 'en'] as const)('disables frozen renewal with an explanation in %s', locale => {
  const html = render(locale, { ...balance, sessions_left: 7, frozen_at: '2026-11-04T12:00:00Z' });
  expect(html).toMatch(locale === 'ar' ? /<button[^>]*disabled=""[^>]*>فكّ التجميد الأول<\/button>/ : /<button[^>]*disabled=""[^>]*>Unfreeze first<\/button>/);
  expect(html).toContain(locale === 'ar' ? '7 حصص' : '7 sessions left');
});
it.each([
  [balance, '30 days left'],
  [{ ...balance, sessions_left: 0 }, '0 sessions left'],
  [{ ...balance, pending: true }, 'Awaiting activation'],
  [{ ...balance, access_until: '2026-11-01' }, '0 days left'],
] as const)('shows the correct package balance %#', (value, label) => {
  const html = render('en', value);
  expect(html).toContain(label);
  expect(html).toContain(value.pending ? 'Activate' : 'Renew');
});
it('has distinct loading and retryable error states', () => {
  expect(render('en')).toContain('role="status"');
  const html = render('en', undefined, 'Read failed');
  expect(html).toContain('role="alert"');
  expect(html).toContain('Read failed');
  expect(html).toContain('Try again');
});
// BUG T-089-C-3: The English balance uses plural sessions even when exactly one remains.
it.fails('uses singular English for one remaining session', () => {
  expect(render('en', { ...balance, sessions_left: 1 })).toContain('1 session left');
});
