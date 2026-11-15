import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { RankOverview } from './components/rank-overview';

vi.mock('@/core/offline', () => ({ localDb: () => ({ userId: 'p' }) }));
vi.mock('@/core/resource', () => ({ useResource: () => ({ status:'ready',data:{lifetime:200,tier:'champion'} }) }));
it('shows the same lifetime medal as the rank page', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider,{locale:'en'},createElement(RankOverview)));
  expect(html).toContain('Silver');
  expect(html).toContain('Gold');
  expect(html).toContain('data-medal-rank="2"');
});
