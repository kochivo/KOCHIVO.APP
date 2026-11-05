import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { MacroRing } from './components/macro-ring';
import { MealCard } from './components/meal-card';

it('isolates macro values while retaining named progress bars', () => {
  const html = renderToStaticMarkup(createElement(MacroRing, {
    eaten: { kcal: 500, protein: 40, carbs: 60, fat: 10 }, target: { kcal: 2000, protein: 160, carbs: 240, fat: 40 },
  }));
  expect(html).not.toContain('dir=');
  expect(html).toContain('<bdi>500</bdi>');
  expect(html.match(/role="progressbar"/g)).toHaveLength(3);
});
it('keeps the meal toggle exposed and isolates abbreviations', () => {
  const html = renderToStaticMarkup(createElement(MealCard, { today: '2026-11-03', meal: { id: 'meal', name: 'الفطار', position: 1, items: [] } }));
  expect(html).toContain('aria-pressed="false"');
  expect(html).toContain('<bdi>P ');
  expect(html).not.toContain('dir=');
});
