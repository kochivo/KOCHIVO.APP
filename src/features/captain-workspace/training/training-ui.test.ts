import { createElement } from 'react';
import type * as Navigation from 'next/navigation';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { TrainingEditor } from './training-editor';
import { TrainingFacts } from './training-facts';
import type { ProgramDraft } from '@/features/programs';
import { emptyWarmup } from '@/features/programs';
import { messages } from './messages';

vi.mock('server-only', () => ({}));
const navigation = vi.hoisted(() => ({ query: '' }));
vi.mock('next/navigation', async importOriginal => ({
  ...await importOriginal<typeof Navigation>(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/captain/programs/p',
  useSearchParams: () => new URLSearchParams(navigation.query),
}));
beforeEach(() => { navigation.query = ''; });
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
it('keeps missing intake explicit and hides fit checks', () => {
  const html = renderToStaticMarkup(createElement(TrainingFacts, {
    profile: { name: 'Ali', intake: null },
    file: { facts: {}, history: [] }, locale: 'en',
    draft, fatPct: null, candidates: [], today: '2026-11-14',
  }));
  expect(html).toContain('The player has not completed their intake');
  expect(html).not.toContain('data-fit-check');
  expect(html).not.toContain('0 kg');
});
it('renders the all-rest start card with one primary action and an enabled assignment button', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(TrainingEditor, {
    mode: 'template', initial: { ...draft, player_id: null, days: draft.days.map(day => ({ ...day, exercises: [], is_rest_day: true })) }, programs: [],
  })));
  expect(html).toContain('ابدأ أول يوم تمرين');
  expect(html.match(/primary-surface/g)).toHaveLength(1);
  expect(html).toContain('احفظ القالب');
  expect(html).not.toContain('aria-label="اسم اليوم"');
  expect(html).toMatch(/<button[^>]*id="assign-program"[^>]*>/);
  expect(html.match(/<button[^>]*id="assign-program"[^>]*>/)?.[0]).not.toMatch(/\sdisabled(?:=|\s|>)/);
  expect(html).toContain('<rect x="13.5" y="12" width="7" height="8">');
  expect(html.indexOf('id="week-menu"')).toBeLessThan(html.indexOf('</header>'));
});
it('opens an empty training template with warm-up and inline exercise search', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(TrainingEditor, {
    mode: 'template', initial: { ...draft, player_id: null, days: draft.days.map(day => ({ ...day, exercises: [], is_rest_day: false })) }, programs: [],
  })));
  expect(html).toContain('التسخين');
  expect(html).toContain(messages.ar.search);
  expect(html).not.toContain('ابدأ أول يوم تمرين');
  expect(html).not.toContain('~0');
});
it('restores the selected day from the exercise return and carries it in the new exercise link', () => {
  navigation.query = 'exerciseProgram=p&exerciseDay=second';
  const html = renderToStaticMarkup(createElement(TrainingEditor, {
    playerId: 'player', programs: [], initial: { ...draft, days: [...draft.days, {
      ...draft.days[0], id: 'second', program_id: 'p', title: 'Selected day', position: 2, warmup: emptyWarmup(), exercises: [],
    }] },
  }));
  expect(html).toContain('value="Selected day"');
  expect(html).not.toContain('Bench Press');
  expect(decodeURIComponent(html)).toContain('exerciseDay=second');
  expect(html).toContain('/captain/library/exercises/new?returnTo=');
});
