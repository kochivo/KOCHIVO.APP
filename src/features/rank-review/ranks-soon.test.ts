import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { RanksSoon } from './components/ranks-soon';

it('shows a coming-soon screen in Arabic and English instead of a missing page', () => {
  const ar = renderToStaticMarkup(createElement(RanksSoon, { locale: 'ar' }));
  expect(ar).toContain('الترتيب قريب');
  expect(ar).toContain('glass-strong');
  expect(ar).not.toContain('404');
  expect(renderToStaticMarkup(createElement(RanksSoon, { locale: 'en' }))).toContain('Ranking is coming soon');
});
