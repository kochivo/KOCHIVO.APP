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
        "meal": "d84931926c2232cc6ff624d6fef2203734962b95678657cf8b3583448bfff373",
        "rest": "c4b943b38cf1a4be1bdb5e98a51d7d6ffb028c67796b70155f0dd380c34a8f10",
        "task": "93a08d93503b9aacafc8e927ed4e402873aa5597acf515cb85c61e19265fe912",
      },
      {
        "exercise": "242e6c4f7a5d9f7bfb3a7fe5310bc155481e1dbd22525b5190903517e189d16d",
        "locale": "en",
        "meal": "7503ba5cf0cff5244a8ba2f1bef8dcaf548f07caacd6f85a5e4a6008adad19e6",
        "rest": "afe4c92051b877f53de75ab27ae5db3c48576bbd4b4737f1fed6f439d806791a",
        "task": "f9f36fdfe7789e8b6da589d675992f7b120e584286d919055945e2f2d291f0ea",
      },
    ]
  `);
});
