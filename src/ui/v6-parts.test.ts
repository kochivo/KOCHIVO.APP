import { expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { UnderlineTabs } from './underline-tabs';
import { FactRow } from './fact-row';
import { SaveStatus } from './save-status';

it('renders route links with exactly one current page and no tab widget semantics', () => {
  const html = renderToStaticMarkup(createElement(UnderlineTabs, { label: 'Player file', items: [
    { href: '/overview', label: 'Overview', active: true }, { href: '/food', label: 'Food' },
  ] }));
  expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  expect(html).toContain('href="/food"');
  expect(html).not.toContain('role="tab"');
});
it('keeps facts as definition terms and values', () => {
  const html = renderToStaticMarkup(createElement('dl', null, FactRow({ label: 'Weight', children: '75 kg' })));
  expect(html).toContain('<dt'); expect(html).toContain('<dd'); expect(html).toContain('75 kg');
});
it('announces saved, saving and retryable failures in Arabic and English', () => {
  expect(renderToStaticMarkup(createElement(SaveStatus, { locale: 'ar', status: 'saved' }))).toContain('محفوظ');
  expect(renderToStaticMarkup(createElement(SaveStatus, { locale: 'ar', status: 'saving' }))).toContain('بيتحفظ…');
  const html = renderToStaticMarkup(createElement(SaveStatus, { locale: 'en', status: 'error', onRetry: () => {} }));
  expect(html).toContain('role="alert"'); expect(html).toContain('Retry');
});
