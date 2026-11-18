import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '@/core/i18n/client';
import { WorkspaceProgramCard } from './components/workspace-program-card';
import { WorkspaceProgramsView } from './components/workspace-programs-view';
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

  it('shows two counted phone tabs and preserves the desktop segmented control', () => {
    const template = { id: 'program', kind: 'program', title: 'Strength', starter: false, count: 2, uses: 3, created_at: '2026-11-14' } as const;
    const noop = () => {};
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(WorkspaceProgramsView, {
      kind: 'program', templates: [template, { ...template, id: 'starter', starter: true }], loading: false,
      creating: false, error: '', createError: '', busy: [], errors: {}, onCreate: noop, onRetry: noop,
      actions: () => ({ onOpen: noop, onAssign: noop, onPreview: noop, onCopy: noop, onRename: noop, onDelete: noop, onArchive: noop }),
    })));
    expect(html).toMatch(/My programs(?:<!-- -->)? 1/);
    expect(html).toMatch(/From KOCHIVO(?:<!-- -->)? 1/);
    expect(html).toMatch(/role="radiogroup" class="[^"]*max-md:hidden"/);
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
  it('renders readable Arabic day names and highlights only the training days', () => {
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(WorkspaceProgramCard, {
      template: { id: 'program', kind: 'program', title: 'Strength', starter: false, count: 2, uses: 3, exerciseCount: 7,
        created_at: '2026-11-14', weekdays: [true, false, false, true, false, false, false] },
      busy: false, onOpen() {}, onAssign() {}, onRetry() {},
    })));
    expect(html.match(/place-items-center rounded-md text-micro bg-lime-soft text-lime/g)).toHaveLength(2);
    expect(html).toContain('سبت: تمرين');
    expect(html).toContain('تلات: تمرين');
    for (const day of ['حد', 'اتنين', 'أربع', 'خميس', 'جمعة']) expect(html).toContain(`${day}: راحة`);
    expect(html).toContain('ادّيه للاعب');
    expect(html).toContain('عدّل');
    expect(html).toContain('<details');
    expect(html).toContain('grid-cols-7');
    expect(html).toMatch(/class="[^"]*\smd:hidden"/);
    expect(html).toContain('max-md:hidden');
    expect(html).toMatch(/ · [7٧] تمرين/);
  });
});
