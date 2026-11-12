import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { TrainingEditor } from './training-editor';
import { TrainingFacts } from './training-facts';
import type { ProgramDraft } from '@/features/programs';
import { emptyWarmup } from '@/features/programs';
import { messages } from './messages';

vi.mock('server-only', () => ({}));
const draft: ProgramDraft = { id: 'p', title: 'Plan', player_id: 'player', status: 'draft', days: [
  { id: 'd', program_id: 'p', title: 'صدر وضهر', position: 1, warmup: emptyWarmup(), exercises: [{
    id: 'e', day_id: 'd', exercise_id: 'x', position: 1, sets: 3, reps_min: 8, reps_max: 12,
    rest_seconds: 90, rir: 2, notes: null, superset_group: null,
    library: { id: 'x', name_en: 'Bench Press', name_ar: 'بنش', body_part: 'chest', equipment: 'barbell', media_path: null },
  }] },
] };
it.each(['ar', 'en'] as const)('renders an inline editable plan with one send action in %s', locale => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(TrainingEditor, {
    playerId: 'player', initial: draft, programs: [],
  })));
  expect(html).toContain('Bench Press');
  expect(html).toContain('صدر وضهر');
  expect(html).not.toContain('اليوم ١ ·');
  expect(html).toContain('1:30');
  expect(html).toContain(messages[locale].send);
  if (locale === 'ar') { expect(html.match(/اتحفظ/g)).toHaveLength(1); expect(html).not.toContain('محفوظ'); }
  expect(html).toContain(messages[locale].search);
  expect(html).toContain('dir="ltr"');
  expect(html).toContain('aria-label=');
  expect(html).toContain('href="/captain/players/player/preview"');
  expect(html).not.toContain(messages[locale].scratch);
});
it('starts with two optional choices and no forced template link', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(TrainingEditor, {
    playerId: 'player', initial: null, programs: [],
  })));
  for (const key of ['scratch', 'scratchBody', 'template', 'templateBody'] as const) expect(html).toContain(messages.ar[key]);
  expect(html).not.toContain('href="/captain/templates"');
});
it.each(['ar', 'en'] as const)('uses the same inline controls with template save and no player actions in %s', locale => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(TrainingEditor, {
    mode: 'template', initial: { ...draft, player_id: null }, programs: [],
  })));
  expect(html).toContain(locale === 'ar' ? 'احفظ القالب' : 'Save template');
  expect(html).not.toContain(messages[locale].send);
  expect(html).not.toContain(messages[locale].newProgram);
  expect(html).not.toContain(messages[locale].history);
  expect(html).not.toContain(messages[locale].facts);
  expect(html).toContain(messages[locale].search);
  expect(html).toContain('Bench Press');
  expect(html).toContain(messages[locale].reorder.replace('{name}', 'بنش'));
  expect(html).toContain(messages[locale].suggestions.replace('{day}', 'صدر وضهر'));
  expect(html).toContain('href="/captain/templates"');
  expect(html.match(/primary-surface/g)).toHaveLength(1);
});
it('keeps missing facts explicit and preserves the sourced facts/history panel', () => {
  const html = renderToStaticMarkup(createElement(TrainingFacts, {
    profile: { name: 'Ali', intake: null, program: null, nutrition: null, checkIns: [] },
    file: { facts: {}, history: [] }, locale: 'en',
  }));
  expect(html).toContain('Not provided');
  expect(html).toContain('Assessment history');
  expect(html).toContain('Goal progress');
  expect(html).not.toContain('0 kg');
});
