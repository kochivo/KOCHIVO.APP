import { expect, it } from 'vitest';
import { adaptForms } from './adapter';
import type { IntakeRow } from '@/features/player-file';
import type { Tables } from '@/types/database';

export const intake: IntakeRow = { player_id: 'player', birth_year: 1999, sex: 'male', height_cm: 178,
  weight_kg: 82, target_weight_kg: 76, experience: 'new', training_days: [0], session_minutes: 60,
  injuries: ['knee'], medical: ['none'], allergies: ['none'], notes: null,
  created_at: '2026-10-01T12:00:00Z', completed_at: '2026-10-01T12:00:00Z', updated_at: null };
export const checkin = (id: string, at: string, weight: number): Tables<'check_ins'> => ({
  id, created_at: at, player_id: 'player', captain_id: 'captain', body_weight_kg: weight,
  waist_cm: 88, body_fat_pct: 20, notes: 'note', photo_paths: [], photo_poses: [], week_start: at.slice(0, 10),
  reviewed_at: null, captain_reply: null,
});
it('sorts all forms newest first and compares only the previous same kind', () => {
  const forms = adaptForms(intake, [checkin('old', '2026-10-08T12:00:00Z', 82),
    checkin('new', '2026-10-15T12:00:00Z', 81)], '2026-11-11');
  expect(forms.map(form => form.snapshot.source.id)).toEqual(['new', 'old', 'player']);
  expect(forms[0]?.comparison.find(row => row.key === 'weight')).toMatchObject({ previousValue: 82, delta: -1, direction: 'better' });
  expect(forms[1]?.comparison.every(row => row.direction === 'new')).toBe(true);
  expect(forms[0]?.previous?.source.id).toBe('old');
});
it('omits unfinished intake and handles an empty timeline', () => {
  expect(adaptForms({ ...intake, completed_at: null }, [], '2026-11-11')).toEqual([]);
  expect(adaptForms(null, [], '2026-11-11')).toEqual([]);
});
it('uses intake goal context for waist-only check-ins without adding an unanswered weight', () => {
  const rows = [checkin('new', '2026-10-15T12:00:00Z', 81), checkin('old', '2026-10-08T12:00:00Z', 82)]
    .map((row, index) => ({ ...row, body_weight_kg: null, waist_cm: index ? 90 : 88 }));
  const form = adaptForms(intake, rows, '2026-11-11')[0];
  expect(form?.comparison).toContainEqual({ key: 'waist', value: 88, previousValue: 90, delta: -2, direction: 'better' });
  expect(form?.comparison.some(row => row.key === 'weight')).toBe(false);
});
