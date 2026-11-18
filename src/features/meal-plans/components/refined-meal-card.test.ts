import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { RefinedMealCard } from './refined-meal-card';
import { messages } from './v11/messages';
import { filterMealPlans, macroSplit } from './v11/meal-library-model';
import { MealLibraryGrid } from './v11/meal-library-grid';

const plan = {
  id: 'plan', title: 'Plan', kcal: 1600, protein: 90, carbs: 45, fat: 20,
  meals: 3, players: [{ id: 'player', name: 'Sam' }], tag: 'training' as const,
};

it('counts each assignment filter within the name search', () => {
  const rows = [plan, { ...plan, id: 'other', title: 'Other plan', players: [] }];
  expect(filterMealPlans(rows, ' PLAN ', 'assigned')).toEqual({
    plans: [plan], counts: { all: 2, assigned: 1, unassigned: 1 },
  });
  expect(filterMealPlans(rows, 'other', 'unassigned').plans).toEqual([rows[1]]);
  expect(filterMealPlans([], '', 'all')).toEqual({
    plans: [], counts: { all: 0, assigned: 0, unassigned: 0 },
  });
});

it('splits the bar by calories from each macro and handles absent targets', () => {
  expect(macroSplit(plan)).toEqual([50, 25, 25]);
  expect(macroSplit({ protein: null, carbs: 0, fat: null })).toEqual([0, 0, 0]);
});

function markup(players: typeof plan.players) {
  return renderToStaticMarkup(createElement(RefinedMealCard, {
    plan: { ...plan, players }, onAssign: () => {}, t: createT(messages, 'en'),
  }));
}

it('shows actual player initials, count, meal count and calorie target', () => {
  const html = markup(plan.players);
  expect(html).toContain('href="/captain/nutrition/plan"');
  expect(html).toContain('>1,600<');
  expect(html).toContain('3 meals');
  expect(html).toContain('1 player');
  expect(html).toContain('title="Sam"');
  expect(html).not.toContain('<button');
});

it('offers a separate assignment control for unused plans', () => {
  const html = markup([]);
  expect(html).toContain('Unassigned');
  expect(html).toMatch(/<button[^>]*>Assign<\/button>/);
});

it('shows the empty-library message and keeps the new-plan control available', () => {
  const html = renderToStaticMarkup(createElement(MealLibraryGrid, {
    plans: [], emptyLibrary: true, onAssign: () => {}, onCreate: () => {}, t: createT(messages, 'en'),
  }));
  expect(html).toContain('No plans yet. Create a new one');
  expect(html).toContain('New plan from scratch or a template');
});
