import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { RefinedMealCard } from './refined-meal-card';
import { messages } from './v11/messages';

it('shows calorie and macro targets with thin bars and the real meal and player counts', () => {
  const html = renderToStaticMarkup(createElement(RefinedMealCard, {
    id: 'plan', title: 'Plan', kcal: 1600, protein: 100, carbs: 100, fat: 0,
    meals: 3, players: 2, split: false, t: createT(messages, 'en'),
  }));
  expect(html).toContain('href="/captain/nutrition/plan"');
  expect(html).toContain('>1,600<');
  expect(html).toContain('3 meals');
  expect(html).toContain('2 players');
  expect(html.match(/role="progressbar"/g)).toHaveLength(3);
  expect(html).toMatch(/aria-label="Carbs" role="progressbar" aria-valuenow="50"[^>]*h-1/);
  expect(html).toMatch(/aria-label="Fat" role="progressbar" aria-valuenow="0"/);
});

it('omits a missing target and its bar', () => {
  const html = renderToStaticMarkup(createElement(RefinedMealCard, {
    id: 'plan', title: 'Plan', kcal: null, protein: null, carbs: 100, fat: null,
    meals: 0, players: 0, split: false, t: createT(messages, 'ar'),
  }));
  expect(html).toContain('100 جم');
  expect(html.match(/role="progressbar"/g)).toHaveLength(1);
});
