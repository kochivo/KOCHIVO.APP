import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { DayEditor } from './components/day-editor';
import type { DraftDay } from './types';
import { emptyWarmup } from './warmup';

it('names repeated exercise controls uniquely and keeps headings and an ordered list', () => {
  const day: DraftDay = { id: 'day', program_id: 'program', title: 'يوم', position: 1, warmup: emptyWarmup(), exercises: [1, 2].map(position => ({
    id: String(position), day_id: 'day', exercise_id: 'bench', position, superset_group: null,
    sets: 3, reps_min: 8, reps_max: position === 1 ? null : 12, rest_seconds: 60, rir: null, notes: null,
    library: { id: 'bench', name_ar: 'بنش', name_en: 'Bench', body_part: 'chest', equipment: null, media_path: null },
  })) };
  const html = renderToStaticMarkup(createElement(DayEditor, { day, update: () => {} }));
  expect(html).toContain('<ol');
  expect(html).toContain('<h2');
  expect(html).toContain('<h3');
  expect(html.match(/grid grid-cols-2 gap-3 @md:grid-cols-4/g)).toHaveLength(2);
  expect(html).not.toContain('size-19');
  expect(html.match(/<input [^>]*inputMode="decimal"/g)).toHaveLength(2);
  expect(html).toContain('border border-line p-4');
  expect(html).toContain('+ إضافة تمرين');
  expect(html).toContain('aria-label="اختيارات التمرين: بنش، 1"');
  expect(html).toContain('aria-label="اختيارات التمرين: بنش، 2"');
  expect(html).not.toContain('<select');
  expect(html).not.toContain('type="checkbox"');
  expect(html).toContain('aria-label="زوّد المجموعات: بنش، 1"');
  expect(html).toContain('aria-label="زوّد المجموعات: بنش، 2"');
});
