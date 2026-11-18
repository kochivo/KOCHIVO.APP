import { expect, it } from 'vitest';
import type { ProgramSnapshot } from '@/core/offline';
import { offlineDays } from './offline-days';

const cardio = { id: 'cardio', day_id: 'training', position: 0, kind: 'walk', minutes: 10, intensity: '', notes: '' };
const snapshot: ProgramSnapshot = {
  id: 'active', player_id: 'player', program_id: 'program', title: 'Program', notes: null,
  settings: {}, training_days: [], days: [
    { id: 'rest', position: 0, title: 'Rest', is_rest_day: true, exercises: [], cardio: [cardio] },
    { id: 'empty', position: 1, title: 'Empty', exercises: [] },
    { id: 'training', position: 2, title: 'Training', exercises: [], cardio: [cardio] },
  ],
};

it('offers only usable days from the verified owner’s snapshot', () => {
  expect(offlineDays(snapshot, 'player').map(day => day.id)).toEqual(['training']);
  expect(offlineDays(snapshot, 'different-user')).toEqual([]);
  expect(offlineDays(snapshot, null)).toEqual([]);
  expect(offlineDays(undefined, 'player')).toEqual([]);
});
