import { createElement } from 'react';
import { renderToReadableStream, renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import type dynamicLoader from 'next/dynamic';
import { LocaleProvider } from '@/core/i18n/client';
import { PricingCards } from './choice/pricing-cards';
import { PricingEntry } from './choice/pricing-entry';
import { catalogFixture } from './tiers/catalog-fixture';

// Next's app compiler aliases next/dynamic to this implementation; Vitest has no app compiler.
vi.mock('next/dynamic', async () => ({
  default: await vi.importActual<typeof dynamicLoader>('next/dist/shared/lib/app-dynamic'),
}));

it('renders default-duration prices and real signup links without running effects or JavaScript', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(PricingCards, { catalog: catalogFixture, name: 'Ali',
      now: '2026-11-28T00:00:00Z', signup: '/login?tab=signup&coach=ali' })));
  expect(html).toContain('Choose your plan with Captain Ali');
  expect(html).toContain('5,200');
  expect(html).toContain('6,500</s>');
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('3 months</button>');
  expect(html).toContain('href="/login?tab=signup&amp;coach=ali&amp;package=quarter&amp;offer=sale"');
  expect(html).toContain('Most popular');
});

it('includes the lazy public entry in server HTML with no browser execution', async () => {
  const stream = await renderToReadableStream(createElement(LocaleProvider, { locale: 'en' },
    createElement(PricingEntry, { catalog: catalogFixture, name: 'Ali',
      now: '2026-11-28T00:00:00Z', signup: '/login?tab=signup&coach=ali' })));
  await stream.allReady;
  const html = await new Response(stream).text();
  expect(html).toContain('5,200');
  expect(html).toContain('package=quarter');
  expect(html).not.toContain('BAILOUT_TO_CLIENT_SIDE_RENDERING');
});
