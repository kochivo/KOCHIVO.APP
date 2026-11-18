import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Segmented } from './segmented';
import type { SegmentedProps } from './segmented';

it('keeps long phone segment labels on one line in a scrollable row', () => {
  const props: SegmentedProps = {
    options: [{ value: 'all', label: 'All 5' }, { value: 'unassigned', label: 'Unassigned plans 4' }],
    value: 'all', onChange: () => {},
  };
  const desktop = renderToStaticMarkup(createElement(Segmented, props));
  const phone = renderToStaticMarkup(createElement(Segmented, { ...props, phoneScroll: true }));
  expect(phone).toContain('max-md:overflow-x-auto');
  expect(phone.match(/max-md:whitespace-nowrap/g)).toHaveLength(2);
  expect(phone.replaceAll(/ max-md:[^" ]+/g, '')).toBe(desktop);
});
