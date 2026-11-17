import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { FoodRow } from './food-row';

it('renders a food icon and keeps the shared row detail and actions', () => {
  const html = renderToStaticMarkup(createElement(FoodRow, { name: 'Rice · 150 g' }, createElement('button', null, 'Swap')));
  expect(html).toContain('demo-food-fallback');
  expect(html).toContain('lucide-utensils');
  expect(html).toContain('150 g');
  expect(html).toContain('<button>Swap</button>');
  const css = readFileSync(new URL('./guided.css', import.meta.url), 'utf8');
  expect(css).toMatch(/\.demo-shell li:has\(> \.demo-food-fallback\) > span:first-child\s*\{ display: none; \}/);
});
