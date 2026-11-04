import { expect, it } from 'vitest';
import { addDay, addExercise, removeExercise } from './draft';
import { convertToWeek, setRestDay, editCardio } from './weekly-draft';
import type { ProgramDraft } from './types';

const empty: ProgramDraft = { id: 'p', player_id: 'player', title: 'Week', status: 'draft', days: [] };
it('maps legacy days in order and fills seven fixed weekdays with rest days', () => {
  const legacy = addDay(empty, 'd', 'Push');
  const result = convertToWeek(legacy, () => 'new');
  expect(result.days.map(d => d.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  expect(result.days[0]?.title).toBe('Push');
  expect(result.days.every(d => d.is_rest_day)).toBe(true);
  expect(legacy.days[0]?.weekday).toBeUndefined();
});
it('requires confirmation before clearing training and clears both exercises and cardio', () => {
  let draft = addExercise(addDay(empty, 'd'), 'd', { id: 'e', name_ar: null, name_en: 'Press',
    equipment: null, body_part: 'chest', media_path: null }, 'pe');
  draft = editCardio(draft, 'd', [{ id: 'c', day_id: 'd', kind: 'Walk', position: 1, minutes: 20, intensity: 'low', notes: '' }]);
  expect(setRestDay(draft, 'd', true, false)).toEqual(draft);
  expect(setRestDay(draft, 'd', true, true).days[0]).toMatchObject({ is_rest_day: true, exercises: [], cardio: [] });
  expect(draft.days[0]?.exercises).toHaveLength(1);
});
it('refuses conversion rather than discarding more than seven legacy days', () => {
  const draft = Array.from({ length: 8 }, (_, i) => `${i}`).reduce((d, id) => addDay(d, id), empty);
  expect(convertToWeek(draft, () => 'new')).toEqual(draft);
});
it('returns weekly days to rest when their last exercise or cardio is removed', () => {
  const weekly = convertToWeek(addExercise(addDay(empty, 'd'), 'd', { id: 'e', name_ar: null,
    name_en: 'Press', equipment: null, body_part: 'chest', media_path: null }, 'pe'), () => 'new');
  expect(removeExercise(weekly, 'd', 'pe').days[0]?.is_rest_day).toBe(true);
  const cardio = editCardio(weekly, 'new', [{ id: 'c', day_id: 'new', position: 1,
    kind: 'Walk', minutes: 20, intensity: 'low', notes: '' }]);
  expect(editCardio(cardio, 'new', []).days[1]?.is_rest_day).toBe(true);
});
