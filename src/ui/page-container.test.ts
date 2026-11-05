import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { PageContainer } from './page-container';

it('widens only the captain container at desktop breakpoints', () => {
  const html = renderToStaticMarkup(createElement(PageContainer, { variant: 'captain' }));
  expect(html).toContain('max-w-7xl px-4 md:px-6');
  expect(html).toContain('lg:max-w-[1600px]');
});

it('preserves the shared default container', () => {
  const html = renderToStaticMarkup(createElement(PageContainer));
  expect(html).toBe('<div class="mx-auto w-full max-w-7xl px-4 md:px-6"></div>');
});
