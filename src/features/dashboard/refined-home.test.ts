import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { HomeHeroView } from './home/home-hero-view';
import { HomeTilesView } from './home/home-tiles-view';
import { homeMessages, homeV11Messages } from './home/messages';

it.each(['ar', 'en'] as const)('gives Start tasks primary emphasis and keeps a single engraved count in %s', locale => {
  const html = renderToStaticMarkup(createElement(HomeHeroView, {
    t: createT(homeV11Messages, locale), locale, tasks: [], count: 4, completed: 2, adherence: 78,
  }));
  expect(html).toContain('ko-strip');
  expect(html).toContain('cut-corner');
  expect(html.match(/class="engraved\b/g)).toHaveLength(1);
  expect(html).toMatch(/<a[^>]*control-primary[^>]*href="\/captain\/tasks"/);
});

it('groups four real home totals in a strip and retains trained count and navigation', () => {
  const html = renderToStaticMarkup(createElement(HomeTilesView, {
    t: createT(homeV11Messages, 'en'), old: createT(homeMessages, 'en'), locale: 'en',
    adherence: 78, previous: 72, trained: 3, active: 8, pending: 4, paid: 4500, progress: 0.5,
  }));
  expect(html).toContain('hairline-cells');
  expect(html).toContain('Active players');
  expect(html).toContain('3/8');
  expect(html).toContain('4,500');
  expect(html).toContain('href="/captain/tasks"');
  expect(html).toContain('href="/captain/billing"');
  expect(html).toContain('aria-valuenow="78"');
  expect(html).not.toContain('<svg');
});
