import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import * as ui from './index';

it('renders a decorative three-piece mark with a lime diagonal', () => {
  expect(ui).toHaveProperty('BrandMark');
  const html = renderToStaticMarkup(createElement(ui.BrandMark, { className: 'size-8' }));
  expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
  expect(html).toContain('class="size-8"');
  expect(html.match(/<polygon\b/g)).toHaveLength(3);
  expect(html.match(/<polygon[^>]*class="fill-lime"/g)).toHaveLength(1);
  expect(html.match(/<polygon[^>]*class="fill-ink"/g)).toHaveLength(2);
});
