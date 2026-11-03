import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { DayEditor } from './components/day-editor';
import type { DraftDay } from './types';

it('names repeated exercise controls uniquely and keeps headings and an ordered list', () => {
  const day: DraftDay = { id: 'day', program_id: 'program', title: 'يوم', position: 1, exercises: [1, 2].map(position => ({
    id: String(position), day_id: 'day', exercise_id: 'bench', position, superset_group: null,
    sets: 3, reps_min: 8, reps_max: null, rest_seconds: 60,
    library: { id: 'bench', name_ar: 'بنش', name_en: 'Bench', body_part: 'chest', equipment: null, media_path: null },
  })) };
  const html = renderToStaticMarkup(createElement(DayEditor, { day, update: () => {} }));
  expect(html).toContain('<ol');
  expect(html).toContain('<h2');
  expect(html).toContain('<h3');
  expect(html).toContain('+ إضافة تمرين');
  expect(html).toContain('aria-label="امسح التمرين: بنش، 1"');
  expect(html).toContain('aria-label="امسح التمرين: بنش، 2"');
  expect(html).toContain('aria-label="زوّد السِتات: بنش، 1"');
  expect(html).toContain('aria-label="زوّد السِتات: بنش، 2"');
});
