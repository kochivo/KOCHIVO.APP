import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '@/core/i18n/client';
import { WorkspaceProgramCard } from './components/workspace-program-card';
import { filterPrograms, programWeek } from './components/workspace-program-model';

describe('workspace program tabs', () => {
  const rows = [
    { id: 'mine', starter: false, uses: 0 },
    { id: 'used', starter: false, uses: 3 },
    { id: 'starter', starter: true, uses: 1 },
    { id: 'archived', starter: false, uses: 2, archived: true },
  ];
  it.each([
    ['mine', ['mine', 'used']], ['ready', ['starter']], ['assigned', ['used', 'starter']],
  ] as const)('filters %s without archived programs', (tab, expected) => {
    expect(filterPrograms(rows, tab).map(row => row.id)).toEqual(expected);
  });
});

describe('program weekday markers', () => {
  it('uses Saturday first and lights only saved training weekdays', () => {
    expect(programWeek([
      { weekday: 0, is_rest_day: false }, { weekday: 2, is_rest_day: true },
      { weekday: 6, is_rest_day: false }, { weekday: null, is_rest_day: false },
    ])).toEqual([true, false, false, false, false, false, true]);
  });
  it('does not invent weekdays for unscheduled days', () => {
    expect(programWeek([{ weekday: null }, {}])).toEqual([false, false, false, false, false, false, false]);
  });
  it('renders seven Arabic letters and highlights only the training days', () => {
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(WorkspaceProgramCard, {
      template: { id: 'program', kind: 'program', title: 'Strength', starter: false, count: 2, uses: 3,
        created_at: '2026-11-14', weekdays: [true, false, false, true, false, false, false] },
      busy: false, onOpen() {}, onAssign() {}, onRetry() {},
    })));
    expect(html.match(/bg-lime-soft text-lime/g)).toHaveLength(2);
    expect(html).toContain('س: تمرين');
    expect(html).toContain('ث: تمرين');
    for (const letter of ['ح', 'ن', 'ر', 'خ', 'ج']) expect(html).toContain(`${letter}: راحة`);
    expect(html).toContain('ادّيه للاعب');
    expect(html).toContain('عدّل');
  });
});
