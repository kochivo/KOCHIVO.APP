import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { SnapshotExercise } from '@/core/offline';
import { ExerciseHeader } from './components/exercise-header';

const exercise: SnapshotExercise = { id: 'row', exercise_id: 'exercise', position: 1, sets: 3,
  reps_min: 8, reps_max: 12, rest_seconds: 60, superset_group: null, rpe: null, tempo: null,
  notes: null, name_ar: 'تمرين', name_en: 'Exercise', media_path: null };
const render = (url?: string | null) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
  createElement(ExerciseHeader, { exercise: { ...exercise, video_url: url }, last: null })));
it('opens an unsupported custom exercise video in a separate tab', () => {
  const html = render('https://example.com/video');
  expect(html).toContain('href="https://example.com/video" target="_blank" rel="noopener noreferrer"');
  expect(html).toContain('Open video');
  expect(html).not.toContain('<iframe');
});
it('handles cached exercises without video and does not link unsafe URLs', () => {
  for (const url of [undefined, null, '', 'javascript:alert(1)', 'http://example.com']) {
    const html = render(url);
    expect(html).not.toContain('Open video');
    expect(html).toContain('href="/player/history?exercise=exercise"');
  }
});
it.each(['ar', 'en'] as const)('shows target RIR beside the reps prescription in %s, including zero', locale => {
  for (const rir of [undefined, null, 0, 2]) {
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale },
      createElement(ExerciseHeader, { exercise: { ...exercise, rir }, last: null })));
    expect(html).toContain('8–12');
    if (rir == null) expect(html).not.toContain('RIR');
    else expect(html).toContain(`RIR ${rir}`);
  }
});// The workout screen lazy-loads the video player; render it synchronously here.
vi.mock('next/dynamic', async () => { const video = await import('./components/exercise-video');
  return { default: (loader: () => unknown) => String(loader).includes('exercise-video') ? video.ExerciseVideo : () => null }; });

