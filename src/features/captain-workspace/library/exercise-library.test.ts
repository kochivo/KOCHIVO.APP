import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ExerciseCard, muscleBodyParts } from './exercise-card';
import { ExerciseDetail } from './exercise-detail';
import type { LibraryExercise } from '@/features/programs';
import type * as Programs from '@/features/programs';
import { ExerciseLibrary, exerciseSearchOptions, emptyMessage } from './exercise-library';
import { LocaleProvider } from '@/core/i18n/client';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';

const mocks = vi.hoisted(() => ({ resource: vi.fn(), search: vi.fn() }));
vi.mock('@/core/resource', () => ({ useResource: mocks.resource }));
vi.mock('@/features/programs', async importOriginal => ({
  ...await importOriginal<typeof Programs>(), searchExercises: mocks.search,
}));

vi.mock('server-only', () => ({}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.resource.mockReturnValue({ status: 'ready', data: { data: [], total: 0 }, retry: vi.fn() });
});
afterEach(() => vi.unstubAllEnvs());

const exercise: LibraryExercise = {
  id: 'exercise', name_ar: 'سكوات', name_en: 'Squat', body_part: 'upper legs',
  equipment: 'barbell', media_path: null, is_own: false,
};

it('shows Arabic first and falls back to English for missing or blank Arabic names', () => {
  for (const name of ['سكوات', null, '  ']) {
    const html = renderToStaticMarkup(createElement(ExerciseCard, {
      exercise: { ...exercise, name_ar: name }, onSelect: () => {},
    }));
    expect(html).toContain(`<bdi>${name?.trim() || 'Squat'}</bdi>`);
    expect(html).toContain('رجل');
    expect(html).toContain('بار');
  }
});

it('marks only the authenticated captain’s exercises as owned', () => {
  for (const own of [true, false]) {
    const html = renderToStaticMarkup(createElement(ExerciseCard, {
      exercise: { ...exercise, is_own: own }, onSelect: () => {},
    }));
    expect(html.includes('بتاعي')).toBe(own);
  }
});

it.each([
  ['all', []], ['legs', ['upper legs', 'lower legs', 'legs', 'leg', 'رجل', 'أرجل']],
  ['chest', ['chest', 'صدر']], ['back', ['back', 'ضهر', 'ظهر']],
  ['shoulders', ['shoulders', 'shoulder', 'كتف']],
  ['arms', ['upper arms', 'lower arms', 'arms', 'ذراع', 'باي', 'تراي']],
  ['abs', ['waist', 'abs', 'core', 'بطن', 'كور']], ['cardio', ['cardio']],
] as const)('maps the %s tab to the existing training labels', (tab, expected) => {
  expect(muscleBodyParts(tab)).toEqual(expected);
});

it('falls back to English instructions and offers editing only for owned rows', () => {
  for (const own of [true, false]) {
    const html = renderToStaticMarkup(createElement(ExerciseDetail, {
      exercise: { ...exercise, is_own: own, instructions_ar: [], instructions_en: ['Keep your back straight.'], secondary_muscles: ['glutes'] },
      onClose: () => {},
    }));
    expect(html).toContain('Keep your back straight.');
    expect(html).toContain('مؤخرة');
    expect(html.includes('/captain/library/exercises/exercise/edit')).toBe(own);
  }
});

it('sends muscle, equipment, ownership and page together to the existing search API', () => {
  expect(exerciseSearchOptions({ query: 'squat', muscle: 'legs', equipment: 'machine', mine: true, page: 2 })).toEqual({
    query: 'squat', bodyPart: '', bodyParts: ['upper legs', 'lower legs', 'legs', 'leg', 'رجل', 'أرجل'],
    equipment: ['machine', 'leverage machine', 'smith machine', 'sled machine'], mine: true, page: 2, limit: 30,
  });
  expect(exerciseSearchOptions({ query: '', muscle: 'all', equipment: '', mine: false, page: 0 })).toMatchObject({
    bodyParts: [], equipment: [], mine: false, page: 0,
  });
});

it('distinguishes an empty personal library from an unsuccessful name search', () => {
  const t = createT(messages, 'ar');
  expect(t(emptyMessage(true, ''))).toBe('لسه معملتش تمرين خاص. اعمل واحد من زرار تمرين جديد.');
  expect(t(emptyMessage(true, 'missing'))).toBe('مفيش تمرين بالاسم ده');
  expect(t(emptyMessage(false, ''))).toBe('مفيش تمرين بالاسم ده');
  expect(t(emptyMessage(true, '', true))).toBe('مفيش تمرين بالاسم ده');
});

it.each(['idle', 'loading', 'error', 'empty'] as const)('renders the %s state', state => {
  mocks.resource.mockReturnValue({ status: state === 'empty' ? 'ready' : state,
    data: state === 'empty' ? { data: [], total: 0 } : undefined, error: state === 'error' ? new Error('private') : undefined, retry: vi.fn() });
  const html = renderToStaticMarkup(createElement(ExerciseLibrary));
  expect(html).toContain(state === 'error' ? 'مش قادرين نحمّل التمارين' : state === 'empty' ? 'مفيش تمرين بالاسم ده' : 'بنحمّل التمارين');
  if (state === 'error') { expect(html).toContain('جرّب تاني'); expect(html).not.toContain('private'); }
});

it('renders a responsive grid, the total, paging controls and creation link', () => {
  mocks.resource.mockReturnValue({ status: 'ready', data: { data: [exercise, { ...exercise, id: 'archived', name_en: 'Archived', archived_at: '2026-11-14' }], total: 1301 } });
  const html = renderToStaticMarkup(createElement(ExerciseLibrary));
  expect(html).toContain('grid-cols-1'); expect(html).toContain('xl:grid-cols-5');
  expect(html).toContain('1,301'); expect(html).not.toContain('Archived');
  expect(html).toContain('href="/captain/library/exercises/new"'); expect(html).toContain('التالي');
});

it('renders all three language dictionaries', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  for (const [locale, style, expected] of [['ar', 'egyptian', 'دوّر بالعربي أو الإنجليزي'],
    ['ar', 'standard', 'ابحث بالعربية أو الإنجليزية'], ['en', 'egyptian', 'Exercise library']] as const) {
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale, style }, createElement(ExerciseLibrary)));
    expect(html).toContain(expected);
  }
});

it('adds phone exercise rows while keeping the desktop grid and disabling the redesign with the flag off', () => {
  mocks.resource.mockReturnValue({ status: 'ready', data: { data: [exercise], total: 1 } });
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  expect(renderToStaticMarkup(createElement(ExerciseLibrary))).not.toContain('max-md:flex-row');
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const html = renderToStaticMarkup(createElement(ExerciseLibrary));
  expect(html).toContain('max-md:flex-row');
  expect(html).toMatch(/<header data-captain-phone-heading="true"[^>]*max-md:flex-nowrap/);
  expect(html).toContain('min-[760px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5');
  expect(html).toContain('سكوات');
  expect(html).toContain('رجل');
  expect(html).toContain('بار');
});

it('loads the first bounded page through the public search API and keeps failures retryable', async () => {
  let load: (() => Promise<unknown>) | undefined;
  mocks.resource.mockImplementation((_key: string, loader: () => Promise<unknown>) => {
    load = loader; return { status: 'loading' };
  });
  renderToStaticMarkup(createElement(ExerciseLibrary));
  if (!load) throw new Error('Missing resource loader');
  mocks.search.mockResolvedValueOnce({ data: [exercise], total: 1301 });
  expect(await load()).toEqual({ data: [exercise], total: 1301 });
  expect(mocks.search).toHaveBeenCalledExactlyOnceWith({ query: '', bodyPart: '', bodyParts: [], equipment: [], mine: false, page: 0, limit: 30 });
  mocks.search.mockResolvedValueOnce({ error: 'private' });
  await expect(load()).rejects.toThrow('مش قادرين نحمّل التمارين');
});

it('keeps the fixed muscle table equal to the programs mapping', async () => {
  const { trainingMuscles } = await import('@/features/programs');
  for (const tab of ['legs', 'chest', 'back', 'shoulders', 'arms', 'abs', 'cardio'] as const) {
    expect(muscleBodyParts(tab)).toEqual(trainingMuscles(tab, [tab]));
  }
});
