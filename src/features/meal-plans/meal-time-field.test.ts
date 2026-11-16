import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { MealTimeField } from './components/meal-time-field';

it('renders a compact labelled pill around the time input instead of a full-width bar', () => {
  const html = renderToStaticMarkup(createElement(MealTimeField, { label: 'معاد الوجبة', value: '08:30', onChange: () => undefined }));
  expect(html).toContain('معاد الوجبة');
  expect(html).toContain('type="time"');
  expect(html).toContain('value="08:30"');
  expect(html).toContain('w-fit');
  expect(html).not.toMatch(/[\s"]w-full\b/);
});
