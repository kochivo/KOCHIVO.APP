import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { PreviewScreen } from './components/preview-screen';
import { PreviewProgram } from './components/preview-program';
import { PreviewNutrition } from './components/preview-nutrition';
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/storage', () => ({ exerciseMediaUrl: () => 'https://example.test/squat.gif' }));
it('renders the English preview with LTR and localized weekdays', () => {
  const html = renderToStaticMarkup(h(LocaleProvider, { locale: 'en' }, h(PreviewScreen, {
    today: '2026-11-03', result: { data: { name: 'Ali', program: null, todayDay: null, nutrition: null, sessions: [],
      week: [{ date: '2026-11-03', trained: false, mealsEaten: 0 }] } },
  })));
  expect(html).toContain('Player preview');
  expect(html).toContain('dir="ltr"');
  expect(html).toContain('Tue');
  expect(html).not.toMatch(/[\u0600-\u06ff]/);
});

it('renders English exercise names, rep ranges and nutrition units', () => {
  const program = renderToStaticMarkup(h(LocaleProvider, { locale: 'en' }, h(PreviewProgram, {
    program: { id: 'active', player_id: 'player', program_id: 'program', title: 'Strength', notes: null,
      settings: { advanced: true }, training_days: [], days: [{ id: 'day', position: 0, title: 'Day 1',
        exercises: [{ id: 'exercise', exercise_id: 'squat', position: 0, name_ar: 'سكوات', name_en: 'Squat',
          media_path: 'squat.gif', video_url: 'https://youtu.be/dQw4w9WgXcQ', sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 60,
          superset_group: 1, rpe: 8, tempo: '3-1-1', notes: null }] }] },
  })));
  expect(program).toContain('Squat');
  expect(program).toContain('Video from your coach');
  expect(program).not.toMatch(/<iframe|<video/);
  expect(program).toContain('alt="Squat"');
  expect(program).toContain('3 sets');
  expect(program).toContain('8–12 reps');
  expect(program).toContain('Rest 60 seconds');
  expect(program).not.toMatch(/[\u0600-\u06ff]/);
  const nutrition = renderToStaticMarkup(h(LocaleProvider, { locale: 'en' }, h(PreviewNutrition, {
    nutrition: { id: 'active', player_id: 'player', plan_id: 'plan', title: 'Meal plan',
      targets: { kcal: 2000, protein: null, carbs: null, fat: null }, meals: [{ id: 'meal', position: 0,
        name: 'Lunch', items: [{ id: 'food', position: 0, name: 'Rice', grams: 100, photo_path: null,
          per100g: { kcal: 130, protein: 3, carbs: 28, fat: 0 }, alternatives: [] }] }] },
  })));
  expect(nutrition).toContain('Rice');
  expect(nutrition).toContain('100 g');
  expect(nutrition).toContain('130 kcal');
  expect(nutrition).toContain('Not set');
  expect(nutrition).not.toMatch(/[\u0600-\u06ff]/);
});
