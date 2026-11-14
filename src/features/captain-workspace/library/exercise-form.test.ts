import { beforeEach, expect, it, vi } from 'vitest';
import { loadExerciseForm, saveCustom } from '../training/data/editor-actions';
import { normalizeExerciseName, similarExercise } from './similar-exercise';
import { exerciseReturnPath, refreshSavedExercise } from './exercise-form';
import { resourceStore } from '@/core/resource/store';
import { searchLibraryExercises } from './data/search';
import { ExercisePreview } from './exercise-preview';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/server', () => ({ getT: async () => (key: string) => key }));
vi.mock('@/features/roster', () => ({ fetchRoster: vi.fn() }));
vi.mock('./data/search', () => ({ searchLibraryExercises: vi.fn() }));
vi.mock('@/core/offline/ids', () => ({ uuidv7: () => '01900000-0000-7000-8000-000000000001' }));
const state = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], writes: [] as Record<string, unknown>[], role: 'captain' }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getClaims: async () => ({ data: { claims: { sub: 'captain' } }, error: null }) },
  from: (table: string) => {
    const filters: Record<string, unknown> = {};
    let written: Record<string, unknown> | undefined;
    const result = () => ({ data: state.rows.filter(row => Object.entries(filters).every(([key, value]) => row[key] === value)), error: null });
    const request = {
      select: () => request, order: () => request, range: async () => result(),
      eq: (key: string, value: unknown) => { filters[key] = value; return request; },
      is: (key: string, value: unknown) => { filters[key] = value; return request; },
      insert: (row: Record<string, unknown>) => { written = row; state.writes.push(row); return request; },
      update: (row: Record<string, unknown>) => { written = row; state.writes.push(row); return request; },
      single: async () => table === 'profiles' ? { data: { role: state.role, suspended_at: null }, error: null } :
        { data: written ?? result().data[0] ?? null, error: !written && !result().data.length ? { code: 'PGRST116' } : null },
    };
    return request;
  },
}) }));
const id = '01900000-0000-7000-8000-000000000001';
const input = { name: '  سكوات  ', nameEn: '', bodyPart: 'upper legs', target: 'فخذ', equipment: 'dumbbell',
  secondaryMuscles: ['glutes'], instructions: ['انزل بهدوء'], video: 'https://example.com/video' };
beforeEach(() => { state.rows = []; state.writes = []; state.role = 'captain'; resourceStore.clear(); vi.clearAllMocks(); });

it('saves every existing column and falls back to the trimmed Arabic name', async () => {
  expect(await saveCustom(input)).toHaveProperty('data');
  expect(state.writes[0]).toMatchObject({ name_ar: 'سكوات', name_en: 'سكوات', equipment: 'dumbbell',
    secondary_muscles: ['glutes'], instructions_ar: ['انزل بهدوء'], owner_id: 'captain' });
});
it('keeps an explicit English name', async () => {
  await saveCustom({ ...input, nameEn: ' Squat ' });
  expect(state.writes[0]?.name_en).toBe('Squat');
});
it.each([
  { name: '' }, { name: 'x'.repeat(61) }, { target: 'x'.repeat(41) },
  { secondaryMuscles: Array(7).fill('glutes') }, { instructions: Array(9).fill('step') },
  { instructions: ['x'.repeat(161)] }, { instructions: ['  '] },
  { video: 'http://example.com' }, { video: 'javascript:alert(1)' },
  { equipment: 'treadmill' }, { equipment: 'unknown' },
])('rejects invalid fields before writing: %j', async patch => {
  expect(await saveCustom({ ...input, ...patch })).toHaveProperty('error');
  expect(state.writes).toEqual([]);
});
it('accepts the count and length boundaries and cardio machines', async () => {
  expect(await saveCustom({ ...input, name: 'x'.repeat(60), target: 'x'.repeat(40),
    secondaryMuscles: Array(6).fill('glutes'), instructions: Array(8).fill('x'.repeat(160)),
    bodyPart: 'cardio', equipment: 'treadmill', video: '' })).toHaveProperty('data');
});
it('loads only an unarchived exercise belonging to the captain for editing', async () => {
  const row = { id, owner_id: 'other', archived_at: null, name_ar: 'سكوات', name_en: 'Squat' };
  state.rows = [row];
  expect(await loadExerciseForm(id)).toHaveProperty('error');
  state.rows = [{ ...row, owner_id: 'captain' }];
  expect(await loadExerciseForm(id)).toMatchObject({ data: { exercise: { id, owner_id: 'captain' } } });
  state.rows = [{ ...row, owner_id: 'captain', archived_at: 'archived' }];
  expect(await loadExerciseForm(id)).toHaveProperty('error');
});
it('rejects invalid edit ids and non-captains', async () => {
  expect(await loadExerciseForm('bad')).toHaveProperty('error');
  state.role = 'player';
  expect(await loadExerciseForm(id)).toHaveProperty('error');
});
it('normalizes articles, alef variants, taa marbuta, spacing and diacritics', () => {
  expect(normalizeExerciseName('  الضَّغْط   بالأداة  ')).toBe('ضغط بالاداه');
  expect(normalizeExerciseName('أ إ آ ة')).toBe('ا ا ا ه');
  expect(normalizeExerciseName('الكتف')).toBe(normalizeExerciseName('كتف'));
});
it('finds similar names in either language and excludes the edited row', () => {
  const rows = [{ id, name_ar: 'الآلة', name_en: 'Machine' }];
  expect(similarExercise('اله', rows)?.id).toBe(id);
  expect(similarExercise('mach', rows)?.id).toBe(id);
  expect(similarExercise('اله', rows, id)).toBeUndefined();
  expect(similarExercise('', rows)).toBeUndefined();
  expect(similarExercise('ال', rows)).toBeUndefined();
  expect(similarExercise('بنش', rows)).toBeUndefined();
});
it.each([undefined, 'https://evil.example/captain', '//evil.example/captain', 'javascript:alert(1)', '/captain/../login', '/captain/\\evil'])('keeps unsafe return destinations in the library: %s', value => {
  expect(exerciseReturnPath(value)).toBe('/captain/library/exercises');
});
it('keeps the editor path and query parameters', () => {
  expect(exerciseReturnPath('/ar/captain/templates/123?day=456')).toBe('/ar/captain/templates/123?day=456');
});
it('renders live draft values and the English fallback in the player preview', () => {
  const values = { ...input, name: 'سكوات جديد', nameEn: '' };
  const preview = renderToStaticMarkup(createElement(ExercisePreview, { values }));
  expect(preview).toContain('سكوات جديد');
  expect(preview).toContain('بتاعي');
  expect(preview).toContain('دمبل');
  const changed = renderToStaticMarkup(createElement(ExercisePreview, { values: { ...values, name: 'بنش', nameEn: 'Bench' } }));
  expect(changed).toContain('Bench');
  expect(changed).toContain('بنش');
  expect(changed).not.toContain('سكوات جديد');
});
const libraryKey = 'exercise-library:{"query":"","muscle":"all","equipment":"","mine":false,"page":0}';
const savedRow = { id, name_ar: 'سكوات جديد', name_en: 'New squat', body_part: 'upper legs', equipment: 'dumbbell', media_path: null,
  owner_id: 'captain', is_own: true, target: null, video_url: null, instructions_ar: [], instructions_en: [], secondary_muscles: [], archived_at: null };
it('reopens edits from saved values and refreshes cached library rows and totals', async () => {
  await resourceStore.mutate(`exercise-form:${id}`, () => ({ exercise: { ...savedRow, name_ar: 'قديم' }, names: [] }), async () => {});
  await resourceStore.mutate(libraryKey, () => ({ data: [], total: 0 }), async () => {});
  vi.mocked(searchLibraryExercises).mockResolvedValue({ data: [savedRow], total: 1 });
  expect(await refreshSavedExercise(savedRow, id)).toBe(true);
  expect(resourceStore.read<{ exercise: { name_ar: string } }>(`exercise-form:${id}`).data?.exercise.name_ar).toBe('سكوات جديد');
  expect(resourceStore.read(libraryKey).data).toEqual({ data: [savedRow], total: 1 });
});
it('keeps a new form blank after creation and exposes refresh failures to the library', async () => {
  vi.mocked(searchLibraryExercises).mockResolvedValue({ error: 'offline' });
  expect(await refreshSavedExercise(savedRow)).toBe(false);
  expect(resourceStore.read<{ exercise: unknown }>('exercise-form:new').data?.exercise).toBeNull();
  expect(resourceStore.read(libraryKey).status).toBe('error');
});
