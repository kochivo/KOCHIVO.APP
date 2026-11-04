import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { RestPanel } from './components/rest-panel';

it('shrinks the ring by remaining / total and disables reduced-motion transitions', () => {
  const html = renderToStaticMarkup(createElement(RestPanel, {
    remaining: 30, total: 60, flashing: false, sound: false,
    onExtend() {}, onSkip() {}, onToggleSound() {},
  }));
  expect(html).toContain('stroke-dashoffset="0.5"');
  expect(html).toContain('text-lime'); expect(html).toContain('text-line');
  expect(html).toContain('motion-reduce:transition-none');
  expect(html).toContain('aria-pressed="false"');
});
