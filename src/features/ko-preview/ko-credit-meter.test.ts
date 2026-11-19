import { renderToStaticMarkup } from 'react-dom/server';
import type * as ReactModule from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import type { KoCredits } from '@/features/ko-core';
import { createT } from '@/core/i18n/messages';
import { KoCreditMeter } from './components/ko-credit-meter';
import { KoUpgradeCard } from './components/ko-upgrade-card';

const hooks = vi.hoisted(() => ({
  credits: null as KoCredits | null,
  effect: undefined as (() => void | (() => void)) | undefined,
}));

vi.mock('react', async original => ({
  ...await original<typeof ReactModule>(),
  useState: () => [hooks.credits, (credits: KoCredits | null) => { hooks.credits = credits; }],
  useEffect: (effect: typeof hooks.effect) => { hooks.effect = effect; },
}));
vi.mock('@/core/i18n/client', () => ({
  useLocale: () => 'ar',
  useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'ar'),
}));

afterEach(() => { hooks.credits = null; hooks.effect = undefined; vi.unstubAllGlobals(); });

it('hides during loading and for players, and renders the used amount and fill for captains', () => {
  expect(KoCreditMeter({ role: 'captain' })).toBeNull();
  hooks.credits = { used: 25, cap: 100, month: 'ديسمبر' };
  const html = renderToStaticMarkup(KoCreditMeter({ role: 'captain' }));
  expect(html).toContain('25 من 100');
  expect(html).toContain('width:25%');
  expect(html).toContain('بيتجدد أول ديسمبر.');
  expect(KoCreditMeter({ role: 'player' })).toBeNull();
});

it('posts the summary flag and hides after a failed request', async () => {
  const response = Promise.resolve(new Response(null, { status: 502 }));
  const fetcher = vi.fn<typeof fetch>(() => response);
  vi.stubGlobal('fetch', fetcher);
  hooks.credits = { used: 25, cap: 100, month: 'ديسمبر' };
  KoCreditMeter({ role: 'captain' });
  hooks.effect?.();
  const request = fetcher.mock.calls[0]?.[1];
  expect(request?.method).toBe('POST');
  expect((request?.body as FormData).get('usage')).toBe('1');
  await response;
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  expect(KoCreditMeter({ role: 'captain' })).toBeNull();
});

it('renders the next tier and two 48px upgrade controls', () => {
  const html = renderToStaticMarkup(KoUpgradeCard({ upgrade: { tier: 'empire', credits: 750 } }));
  expect(html).toContain('EMPIRE');
  expect(html).toContain('750 في الشهر');
  expect(html.match(/<(?:a|button)[^>]*min-h-12[^>]*>/g)).toHaveLength(2);
});
