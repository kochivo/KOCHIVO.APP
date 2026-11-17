import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ProgressBar } from './progress-bar';
import { StatStrip } from './stat-strip';

it('renders one card with an equal cell per stat and keeps signed deltas left-to-right', () => {
  const html = renderToStaticMarkup(createElement(StatStrip, { items: [
    { label: 'A', value: 12, unit: 'kg', percent: 40, delta: '+6%' },
    { label: 'B', value: 3, tone: 'warn', note: 'n' },
  ] }));
  expect(html.match(/<section/g)).toHaveLength(1);
  expect(html).toContain('repeat(2, minmax(0, 1fr))');
  expect(html).toContain('<bdi dir="ltr"');
  expect(html).toContain('text-warn');
  expect(html.match(/role="progressbar"/g)).toHaveLength(1);
});

it('renders nothing for an empty list', () => {
  expect(renderToStaticMarkup(createElement(StatStrip, { items: [] }))).toBe('');
});

it('offers a 4px bar without changing the default bar', () => {
  expect(renderToStaticMarkup(createElement(ProgressBar, { value: 1, max: 2, thin: true }))).toContain('h-1');
  expect(renderToStaticMarkup(createElement(ProgressBar, { value: 1, max: 2 }))).toContain('h-2');
});

it('ships the refined surface utilities with tokens only', () => {
  const css = readFileSync(new URL('../app/refined.css', import.meta.url), 'utf8');
  for (const name of ['ko-strip', 'cut-corner', 'engraved', 'nav-slash', 'hairline-cells', 'tone-info']) expect(css).toContain(`@utility ${name}`);
  expect(css).not.toMatch(/#[0-9a-f]{3,6}\b/i);
});
