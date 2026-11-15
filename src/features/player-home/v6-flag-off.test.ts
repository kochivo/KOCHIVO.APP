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
        "exercise": "bdbb6cc1f5c8f0d943898c79d6660b952623cf8022eaba85aa54762445d0c7ba",
        "locale": "ar",
        "meal": "1d6bea68b108627be540474d0dcd0b70df3022dc9924a052f58938a8787c293b",
        "rest": "b37724e3c81c386a2e0f5dbfb510c6bf6ca172ff6375648762931dd144f83417",
        "task": "13ca054607169af5b9eed0efc98a3b4abf6e97497340623f9e081f5d1feca3ac",
      },
      {
        "exercise": "d99080cdafdd96e0677499db04b9b34b09a048d920f10005c9700553d26112c4",
        "locale": "en",
        "meal": "493387202c47a98e09a55b43707da30d43a12f0bf4d9b2efa07fb859a906b81c",
        "rest": "604313a4028732290e9a9c29c79ea1dc1357e2dd92b8ff1027bc650c208a9f8b",
        "task": "df68b219ae6c532dc92d86a492a445b82198befde169c84da58d4c6ba7d02f81",
      },
    ]
  `);
});
