import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { DayEditor } from './components/day-editor';
import type { DraftDay } from './types';

const day: DraftDay = { id: 'day', program_id: 'program', title: '', position: 1,
  weekday: 0, is_rest_day: true, exercises: [], cardio: [] };
const render = (value: DraftDay, locale: 'ar' | 'en') => renderToStaticMarkup(createElement(LocaleProvider,
  { locale }, createElement(DayEditor, { day: value, update() {} })));

it('shows a translated Saturday rest panel without add controls', () => {
  for (const [locale, weekday, rest] of [['ar', 'السبت', 'يوم راحة واستشفاء'],
    ['en', 'Saturday', 'Rest and recovery day']] as const) {
    const html = render(day, locale);
    expect(html).toContain(weekday);
    expect(html).toContain(rest);
    expect(html).toContain('border-dashed');
    expect(html).not.toContain('program-add-exercise');
    expect(html).not.toContain('<datalist');
  }
});
it('shows cardio suggestions, bounded minutes, notes and accessible intensity choices', () => {
  const html = render({ ...day, is_rest_day: false, cardio: [{ id: 'cardio', day_id: day.id, position: 1,
    kind: 'Walk', minutes: 20, intensity: 'moderate', notes: 'Easy' }] }, 'en');
  expect(html).toContain('+ Add cardio');
  expect(html).toContain('Cardio minutes');
  expect(html).toContain('value="Walking"');
  expect(html).toContain('value="Treadmill"');
  expect(html).toContain('value="Stairmaster"');
  expect(html.match(/type="radio"/g)).toHaveLength(3);
  expect(html).toContain('value="Easy"');
  expect(html).not.toMatch(/[\u0600-\u06ff]/);
});
