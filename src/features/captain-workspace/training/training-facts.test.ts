import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { emptyWarmup } from '@/features/programs';
import type { ProgramDraft } from '@/features/programs';
import type { Profile } from '../player-file/types';
import { TrainingFacts } from './training-facts';

vi.mock('server-only', () => ({}));
afterEach(() => vi.unstubAllEnvs());
const profile: Profile = { name: 'Ali', program: null, nutrition: null, checkIns: [], intake: {
  birthYear: 1996, sex: 'male', heightCm: 180, weightKg: 85, targetWeightKg: 80,
  trainingDays: [0, 2, 4], sessionMinutes: 30, experience: 'new', injuries: ['shoulder'],
  allergies: ['nuts'], medical: [], notes: 'Intake note', completedAt: '2026-11-01',
} };
const draft: ProgramDraft = { id: 'p', player_id: 'player', title: 'Plan', status: 'draft', days: [{
  id: 'day', program_id: 'p', title: 'Day', position: 1, warmup: emptyWarmup(), exercises: [],
}] };
const file = { facts: {}, history: [] };
const props = { profile, file, locale: 'en' as const, draft, day: draft.days[0], fatPct: 19.5, candidates: [], today: '2026-11-14' };
it('keeps long names readable with and without intake in Arabic and English', () => {
  for (const locale of ['ar', 'en'] as const) {
    for (const intake of [profile.intake, null]) {
      const name = locale === 'ar' ? 'يوسف أحمد محمد' : 'Youssef Ahmed Mohamed';
      const html = renderToStaticMarkup(createElement(TrainingFacts, { ...props, locale, profile: { ...profile, name, intake } }));
      expect(html).toContain(`min-w-0 break-words font-display text-lg font-semibold">${name}</h2>`);
      if (intake) {
        expect(html).toContain('min-w-0 basis-full');
        expect(html).toContain('flex w-full min-w-0 flex-wrap');
      }
    }
  }
});
it('hides the player panel for templates even when player data is supplied', () => {
  expect(renderToStaticMarkup(createElement(TrainingFacts, { ...props, draft: { ...draft, player_id: null } }))).toBe('');
});
it('shows missing intake without fit checks', () => {
  const html = renderToStaticMarkup(createElement(TrainingFacts, { ...props, profile: { ...profile, intake: null }, locale: 'ar' }));
  expect(html).toContain('اللاعب لسه مكملش بياناته');
  expect(html).not.toContain('data-fit-check');
});
it('renders the expanded desktop card and collapsed mobile summary with intake facts', () => {
  const html = renderToStaticMarkup(createElement(TrainingFacts, props));
  expect(html).toContain('Ali');
  expect(html).toContain('85 kg');
  expect(html).toContain('80 kg');
  expect(html).toContain('19.5');
  expect(html).toContain('Intake note');
  expect(html).toContain('Nuts');
  expect(html).toContain('Shoulder');
  expect(html).toContain('href="/captain/players/player"');
  expect(html).toContain('aria-expanded="false"');
  expect(html.match(/data-training-day=/g)).toHaveLength(7);
  expect(html).toContain('1 day in the program, 3 days available');
});
it('recalculates day count and the selected day estimate from new draft props', () => {
  const day = draft.days[0]; if (!day) throw new Error('Missing day');
  const changed = { ...draft, days: Array.from({ length: 4 }, (_, index) => ({ ...day, id: String(index) })) };
  const html = renderToStaticMarkup(createElement(TrainingFacts, { ...props, draft: changed }));
  expect(html).toContain('4 days in the program, 3 days available');
  expect(html).toMatch(/data-fit-check="days"[^>]*text-warn/);
});
it('recalculates minutes and counts each tagged exercise once after edits', () => {
  const day = draft.days[0]; if (!day) throw new Error('Missing day');
  const library = { id: 'bench', name_en: 'Bench', name_ar: null, body_part: 'chest', equipment: 'barbell', media_path: null };
  const row = { id: 'row', day_id: day.id, exercise_id: library.id, library, position: 1, sets: 3,
    reps_min: 8, reps_max: 12, rest_seconds: 90, rir: 2, superset_group: null, notes: null };
  const candidates = [{ exercise_id: library.id, pattern: 'h_push', stress: ['shoulder'], library }];
  const selected = { ...day, warmup: { ramp: false, items: [{ id: 'w', name: 'Walk', amount: 5, unit: 'min' as const }] },
    exercises: [row, { ...row, id: 'untagged', exercise_id: 'custom' }],
  };
  const render = (current: typeof selected) => renderToStaticMarkup(createElement(TrainingFacts, { ...props, day: current, candidates }));
  expect(render(selected)).toContain('About 20 minutes today, 30 available');
  expect(render(selected)).toContain('1 exercise may affect an injury');
  const edited = { ...selected, exercises: selected.exercises.map(item => ({ ...item, sets: 10 })) };
  expect(render(edited)).toContain('About 50 minutes today, 30 available');
  expect(render(edited)).toMatch(/data-fit-check="minutes"[^>]*text-warn/);
});
it('uses the standard Arabic messages when that style is selected', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar', style: 'standard' },
    createElement(TrainingFacts, { ...props, locale: 'ar', profile: { ...profile, intake: null } })));
  expect(html).toContain('اللاعب لم يكمل بياناته بعد');
  expect(html).toContain('ملفه الكامل');
});
