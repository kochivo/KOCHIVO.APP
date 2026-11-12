import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { TargetsBar } from './components/targets-bar';
import { LiveTargets } from './components/live-targets';
import { HouseholdQuantity } from './components/household-quantity';
import { SmartNotesPanel } from './components/smart-notes-panel';

it('renders nutrition targets in English', () => {
  const macros = { kcal: 2000, protein: 150, carbs: 225, fat: 56 };
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(TargetsBar, {
    targets: macros, totals: macros, onChange() {},
  })));
  expect(html).toContain('Targets and totals');
  expect(html).not.toMatch(/[\u0600-\u06ff]/);
});
it('renders live target statuses in English with accessible progress bars', () => {
  const targets = { kcal: 2000, protein: 150, carbs: 225, fat: 56 };
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(LiveTargets, {
    targets, totals: { ...targets, protein: 100, fat: 70 },
  })));
  expect(html).toContain('text-lime');
  expect(html).toContain('text-muted');
  expect(html).toContain('text-warn');
  expect(html.match(/<progress/g)).toHaveLength(4);
});
it('renders Egyptian household units and localized allergy reasons', () => {
  const item = { id: 'i', position: 1, grams: 90, alternatives: [], food: { id: 'f', name: 'عيش بلدي', custom: false, photo: null,
    kcal: 250, protein: 8, carbs: 50, fat: 1, units: [{ key: 'loaf', name_ar: 'رغيف', name_en: 'loaf', grams: 90 }] } };
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(HouseholdQuantity, { item, onChange() {} })));
  expect(html).toContain('رغيف (90 جم)');
  expect(html).toContain('value="1"');
  const notes = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(SmartNotesPanel, {
    meals: [{ id: 'm', name: 'Meal', position: 1, items: [item] }], planMeals: [],
    targets: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, facts: { allergies: { key: 'allergies', value: ['gluten'], source: { kind: 'intake', id: 'p', at: '' }, isNew: false } },
    logs: [], today: '2026-11-11', onIncrease() {},
  })));
  expect(notes).toContain('حساسية الجلوتين');
  expect(notes).not.toContain('gluten');
});
