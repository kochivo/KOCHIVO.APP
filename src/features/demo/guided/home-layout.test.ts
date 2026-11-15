import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createT } from '@/core/i18n/messages';
/* eslint-disable no-restricted-imports -- T-288 verifies the shared view's production and embedded layout modes. */
import { HomeTilesView } from '@/features/dashboard/home/home-tiles-view';
import { homeMessages, homeV11Messages } from '@/features/dashboard/home/messages';
/* eslint-enable no-restricted-imports */

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8');

it('keeps full card heights inside the fixed-height scrolling captain grid', () => {
  const rule = read('./guided.css').match(/\.demo-captain-main\s*\{([^}]+)\}/)?.[1] ?? '';
  expect(rule).toContain('grid-auto-rows: max-content');
  expect(rule).toContain('overflow: auto');
});

it('uses the tile container width and preserves whole words in KPI labels', () => {
  const view = read('../../dashboard/home/home-tiles-view.tsx');
  expect(view).toContain('@container/home-tiles');
  expect(view).toContain('@min-[1000px]/home-tiles:grid-cols-4');
  expect(view).toContain("responsiveTo = 'viewport'");
  expect(read('./captain-home.tsx')).toContain('responsiveTo="container"');
  expect(view).toContain('wrap-normal');
});

it('stacks tasks and activity until the home container can fit the real two-column layout', () => {
  const home = read('./captain-home.tsx');
  expect(home).toContain('@container/demo-home');
  expect(home).toContain('grid auto-rows-max grid-cols-1');
  expect(home).toContain('@min-[1000px]/demo-home:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]');
  expect(home).not.toContain('min-[1200px]:grid-cols-2');
  expect(home).toContain('items-start');
});

it('preserves the real dashboard tile markup unless container responsiveness is requested', () => {
  const props = { t: createT(homeV11Messages, 'en'), old: createT(homeMessages, 'en'), locale: 'en' as const,
    adherence: 78, previous: 72, trained: 16, active: 20, pending: 4, paid: 21400, progress: 0 };
  const production = renderToStaticMarkup(createElement(HomeTilesView, props));
  expect(production).toMatch(/^<div data-home-tiles="true" class="grid grid-cols-2 gap-stack min-\[1000px\]:grid-cols-4">/);
  expect(production).not.toContain('@container');
  expect(production).toContain('<small class="text-xs text-muted">Weekly adherence</small>');
  const embedded = renderToStaticMarkup(createElement(HomeTilesView, { ...props, responsiveTo: 'container' }));
  expect(embedded).toContain('class="@container/home-tiles"');
  expect(embedded).toContain('@min-[1000px]/home-tiles:grid-cols-4');
  expect(embedded).toContain('<small class="wrap-normal text-xs text-muted">Weekly adherence</small>');
});
