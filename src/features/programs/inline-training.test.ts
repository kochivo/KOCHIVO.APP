import { describe, expect, it } from 'vitest';
import { addDay, addExercise, removeExercise, reorderExercise, updateExercise } from './draft';
import { suggestedExercises } from './inline-training';
import { validateForActivation } from './summary';
import type { LibraryExercise, ProgramDraft } from './types';

const chest: LibraryExercise = { id: 'bench', name_en: 'Bench Press', name_ar: 'بنش', body_part: 'chest', equipment: 'barbell', media_path: null };
const back: LibraryExercise = { ...chest, id: 'row', body_part: 'back', name_en: 'Row' };
const leg: LibraryExercise = { ...chest, id: 'squat', body_part: 'upper legs', name_en: 'Squat' };
const blank: ProgramDraft = { id: 'program', player_id: 'player', title: 'Training', status: 'draft', days: [] };
describe('inline training', () => {
  it('builds from scratch, removes and repositions rows without mutating the original', () => {
    let draft = addDay(blank, 'day', 'صدر وضهر');
    draft = addExercise(draft, 'day', chest, 'one');
    draft = addExercise(draft, 'day', back, 'two');
    draft = reorderExercise(draft, 'day', 'two', 0);
    expect(draft.days[0]?.exercises.map(row => [row.id, row.position])).toEqual([['two', 1], ['one', 2]]);
    expect(removeExercise(draft, 'day', 'two').days[0]?.exercises.map(row => row.position)).toEqual([1]);
    expect(blank.days).toEqual([]);
  });
  it('bounds sets and keeps valid rep/rest prescriptions', () => {
    const draft = addExercise(addDay(blank, 'day'), 'day', chest, 'one');
    expect(updateExercise(draft, 'day', 'one', { sets: 0 }).days[0]?.exercises[0]?.sets).toBe(1);
    expect(updateExercise(draft, 'day', 'one', { sets: 21 }).days[0]?.exercises[0]?.sets).toBe(20);
  });
  it('suggests muscles from Arabic and English day names and excludes already added exercises', () => {
    expect(suggestedExercises('صدر وضهر', [], [chest, back, leg]).map(row => row.id)).toEqual(['bench', 'row']);
    expect(suggestedExercises('Leg day', [], [chest, back, leg]).map(row => row.id)).toEqual(['squat']);
    expect(suggestedExercises('Chest', ['bench'], [chest, back])).toEqual([]);
  });
  it('infers muscles from existing exercises for a custom day title', () => {
    expect(suggestedExercises('A', [], [chest, back], ['back']).map(row => row.id)).toEqual(['row']);
  });
  it('validates send without requiring a template', () => {
    expect(validateForActivation(blank)).not.toEqual([]);
    expect(validateForActivation(addExercise(addDay(blank, 'day'), 'day', chest, 'one'))).toEqual([]);
    expect(validateForActivation({ ...blank, player_id: null, title: '' })).toHaveLength(3);
  });
});
