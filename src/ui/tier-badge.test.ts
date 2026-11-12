import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { TierBadge } from './tier-badge';
it('hides the legacy basic tier and renders the selected tier color', () => {
  expect(renderToStaticMarkup(createElement(TierBadge, { tier: { name: 'أساسي', color: 'lime' } }))).toBe('');
  expect(renderToStaticMarkup(createElement(TierBadge, { tier: { name: 'VIP', color: 'warn' } }))).toContain('text-warn');
});
