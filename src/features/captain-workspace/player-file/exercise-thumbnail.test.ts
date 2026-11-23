import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { ExerciseImage } from '@/ui/exercise-image';
import { OverviewActivity } from './overview-activity';
import type { FileActivity } from './load-activity';
import type { Profile } from './types';

afterEach(() => vi.unstubAllEnvs());

it('loads a visible player-file thumbnail eagerly instead of a dark placeholder', () => {
  const html = renderToStaticMarkup(createElement(ExerciseImage, {
    src: 'https://example.test/exercise.gif', alt: '', width: 44, height: 44, eager: true,
  }));
  expect(html).toContain('exercise.gif');
  expect(html).toContain('loading="eager"');
  expect(html).not.toContain('data:image/svg+xml,');
  expect(html).toContain('animate-pulse');
});

it('keeps offscreen thumbnails lazy but shows a skeleton while they load', () => {
  const html = renderToStaticMarkup(createElement(ExerciseImage, {
    src: 'https://example.test/exercise.gif', alt: 'Squat', width: 84, height: 84,
  }));
  expect(html).toContain('data:image/svg+xml,');
  expect(html).toContain('loading="lazy"');
  expect(html).not.toContain('exercise.gif');
  expect(html).toContain('animate-pulse');
});

it('renders last-workout thumbnails eagerly in the player file', () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.test');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'a'.repeat(20));
  const profile = { checkIns: [] } as unknown as Profile;
  const activity = {
    scans: [], last: null, nutrition: null,
    sets: [{
      exercise_id: 'ex-1', program_exercise_id: 'pe-1', set_index: 0, drop_index: 0, reps: 10, weight_kg: 20,
      exercises: { name_ar: 'سكوات', name_en: 'Squat', media_path: 'exercise-media/0001.gif' },
    }],
  } as unknown as FileActivity;
  const html = renderToStaticMarkup(createElement(OverviewActivity, {
    profile, activity, playerId: 'player-1', locale: 'ar', overview: null, training: null,
  }));
  expect(html).toContain('0001.gif');
  expect(html).toContain('loading="eager"');
  expect(html).not.toContain('data:image/svg+xml,');
});
