import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { PlayerMedalChip } from './rank-chip';
vi.mock('server-only', () => ({}));

it('renders the captain chip from lifetime with the medal, name and points', () => {
  const html = renderToStaticMarkup(createElement(PlayerMedalChip, { lifetime: 254, locale: 'en' }));
  expect(html).toContain('data-medal-rank="2"');
  expect(html).toContain('Silver');
  expect(html).toContain('254 points');
  expect(renderToStaticMarkup(createElement(PlayerMedalChip, { lifetime: 600, locale: 'ar' }))).toContain('ماس');
});
