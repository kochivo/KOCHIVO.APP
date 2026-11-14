import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { catalogFixture as catalog } from './tiers/catalog-fixture';
import { WorkspaceTierCard } from './components/workspace-tier-card';
import { WorkspaceOffersCard } from './components/workspace-offers-card';

const noop = () => {};
it('renders real tier features and all duration prices with a featured treatment', () => {
  const tier = catalog.tiers[0];
  if (!tier) throw new Error('Missing tier fixture');
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' },
    createElement(WorkspaceTierCard, { tier, packages: catalog.packages, busy: false, onEdit: noop, onPackage: noop })));
  for (const value of ['VIP', 'Weekly call', '2,500', '6,500', 'glass-featured']) expect(html).toContain(value);
  expect(html.match(/<button/g)).toHaveLength(4);
});
it('shows the actual offer state instead of marking expired offers as running', () => {
  const render = (now: string) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' },
    createElement(WorkspaceOffersCard, { catalog, now: new Date(now), busy: false, onNew: noop, onEdit: noop })));
  expect(render('2026-11-28T12:00:00Z')).toContain('شغال');
  const ended = render('2026-12-01T12:00:00Z');
  expect(ended).toContain('خلص');
  expect(ended).not.toContain('شغال');
});
