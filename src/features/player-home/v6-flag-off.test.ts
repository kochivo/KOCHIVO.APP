import { createHash } from 'node:crypto';
import { createElement } from 'react';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { SnapshotExercise } from '@/core/offline';
import { NextTaskCard } from './components/next-task-card';
import { MealCard } from '../nutrition/components/meal-card';
import { ExerciseHeader } from '../workout/components/exercise-header';
import { RestPanel } from '../workout/components/rest-panel';

afterEach(() => vi.unstubAllEnvs());
const hash = (element: ReactElement, locale: 'ar' | 'en') => createHash('sha256').update(
  renderToStaticMarkup(createElement(LocaleProvider, { locale }, element)),
).digest('hex');
const exercise: SnapshotExercise = { id: 'p', exercise_id: 'e', position: 1, sets: 3,
  reps_min: 8, reps_max: 12, rest_seconds: 90, superset_group: null, rpe: null, rir: 2,
  tempo: null, notes: 'Coach note', name_ar: 'بنش', name_en: 'Bench press', media_path: null };

it('preserves the pre-T-195 flag-off markup in Arabic and English', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  const results = (['ar', 'en'] as const).map(locale => ({ locale,
    task: hash(createElement(NextTaskCard, { task: { kind: 'start', name: 'Push', href: '/player/workout/day' } }), locale),
    meal: hash(createElement(MealCard, { meal: { id: 'meal', name: 'Breakfast', position: 1, items: [] }, today: '2026-11-12' }), locale),
    exercise: hash(createElement(ExerciseHeader, { exercise, last: null }), locale),
    rest: hash(createElement(RestPanel, { remaining: 54, total: 90, flashing: false, onExtend() {}, onSkip() {} }), locale),
  }));
  expect(results).toMatchInlineSnapshot(`
    [
      {
        "exercise": "73438a1c26a2e4677591b756ce8fb3b4457eb8649095d19dcbf3ae0c33ed886d",
        "locale": "ar",
        "meal": "55e6fcb40472bbef681b4bda6d98e98c1905b84dae78ed71a0678d8c91d671e4",
        "rest": "7895548b3dbef521756896ffd47e5dcaa4a4de2c441616cbe393738244f06f32",
        "task": "d43ebdd350fcaa58421e1ba70611c4ad536de39c9f644d535752e3f3e871f063",
      },
      {
        "exercise": "242e6c4f7a5d9f7bfb3a7fe5310bc155481e1dbd22525b5190903517e189d16d",
        "locale": "en",
        "meal": "7d627f8dcd68e07723ed67b2209edb750281c763d3eee3bcd3ada393d745723c",
        "rest": "f15bb7d4050ccdd68343a8fe9e441c3036b8df361e25041917be0a15cad81f1a",
        "task": "e3380f6fa7e60ff7366b114033900d8528477fcae1da8deab3c4cecc5fa908c9",
      },
    ]
  `);
});
