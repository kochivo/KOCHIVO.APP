import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { NotFoundPage } from './not-found-page';

vi.mock('@/core/i18n/server', () => ({ getT: async () => createT(messages, 'en') }));

it('renders the public brand, missing-page message and a single home action', async () => {
  const html = renderToStaticMarkup(await NotFoundPage());
  expect(html).toContain('logo-primary.png');
  expect(html).toContain('logo-primary-light.png');
  expect(html).toContain('This page doesn&#x27;t exist');
  expect(html).toContain('href="/"');
  expect(html.match(/<a /g)).toHaveLength(1);
});

it('provides the same message keys in all three writing styles', () => {
  expect(Object.keys(messages.arStd ?? {})).toEqual(Object.keys(messages.ar));
  expect(Object.keys(messages.en)).toEqual(Object.keys(messages.ar));
});
