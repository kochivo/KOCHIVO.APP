import { afterEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import * as generator from '@/features/program-generator/server';
import type { Candidate } from '@/features/program-generator/server';
import type { KoActor } from './data/account';
import { executeIntent } from './data/execute';
import { buildTrainingDraft } from './data/training-draft';
import { messages } from './messages';

vi.mock('server-only', () => ({}));
afterEach(() => vi.restoreAllMocks());

const player = { id: '11111111-1111-4111-8111-111111111111', name: 'Ali' };
const approvalId = '22222222-2222-4222-8222-222222222222';
const now = 1_800_000_000_000;
const movementPatterns = ['squat', 'hinge', 'lunge', 'h_push', 'v_push', 'h_pull', 'v_pull',
  'chest_iso', 'shoulder_iso', 'biceps', 'triceps', 'legs_iso', 'calves', 'core'] as const;
const candidates: Candidate[] = movementPatterns.flatMap(pattern => [0, 1, 2].map(index => {
  const id = `${pattern}-${index}`;
  return { exercise_id: id, pattern, kind: 'compound', equipment: 'bodyweight', min_level: 'beginner', usage: 0,
    stress: index === 0 ? ['knee'] : [], library: {
      id, name_ar: 'تمرين ' + id, name_en: id, body_part: '', equipment: '', media_path: null,
    } };
}));
const intake = { training_days: [0, 3], experience: 'over_3y', session_minutes: 45, injuries: ['knee'] };

function setup(catalog = candidates) {
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: intake, error: null }) };
  const actor = { role: 'captain', id: approvalId, db: { from: () => query } } as unknown as KoActor;
  vi.spyOn(generator, 'loadCandidates').mockResolvedValue({ data: catalog });
  return actor;
}

function build(args: Parameters<typeof buildTrainingDraft>[2]) {
  return buildTrainingDraft(setup(), player, args, approvalId, now, 'en', createT(messages, 'en'));
}

it('uses intake weekdays, experience, session time, and injuries when the brief omits them', async () => {
  const draft = await build({});
  const active = draft?.payload.days.filter(day => !day.is_rest_day);
  expect(active?.map(day => [day.weekday, day.exercises.length])).toEqual([[1, 4], [4, 4]]);
  expect(active?.flatMap(day => day.exercises).every(row => row.sets === 4 && !row.exercise_id.endsWith('-0'))).toBe(true);
  expect(draft?.payload.title).toBe('2-day fitness program – Ali');
});

it('prefers named weekdays and explicit prescription values over intake defaults', async () => {
  const draft = await build({ title: 'Strength week', goal: 'strength', days: 3, weekdays: [0, 6], level: 'beginner', minutes: 60 });
  const active = draft?.payload.days.filter(day => !day.is_rest_day);
  expect(active?.map(day => [day.weekday, day.position, day.exercises.length])).toEqual([[0, 1, 6], [1, 2, 6]]);
  expect(active?.[0]?.exercises[0]).toMatchObject({ sets: 3, reps_min: 3, reps_max: 6, rest_seconds: 150 });
  expect(draft?.payload.title).toBe('Strength week');
});

it.each([
  [3, [0, 2, 4]], [4, [0, 1, 3, 4]], [5, [0, 1, 2, 3, 4]], [6, [0, 1, 2, 3, 4, 5]],
] as const)('spreads %i days across the Saturday-first approval week', async (days, expected) => {
  const draft = await build({ days, goal: 'muscle' });
  const active = draft?.payload.days.filter(day => !day.is_rest_day);
  expect(active?.map(day => day.weekday)).toEqual(expected);
  expect(draft?.payload.title).toBe(`${days}-day muscle gain program – Ali`);
  expect(draft?.preview.split('\n')).toHaveLength(days + 1);
  expect(draft?.preview).toMatch(/^Saturday – .+: .+ 4×8-12/);
  expect(draft?.preview).toContain('You can change exercises in the program editor after saving.');
  const ids = new Set(candidates.map(row => row.exercise_id));
  for (const day of active ?? []) {
    const selected = day.exercises.map(row => row.exercise_id);
    expect(selected.every(id => ids.has(id))).toBe(true);
    expect(new Set(selected).size).toBe(selected.length);
  }
});

it.each(['invalid brief', 'empty catalog'])('suggests the generator for an %s', async failure => {
  const actor = setup(failure === 'empty catalog' ? [] : candidates);
  const args = failure === 'invalid brief' ? { weekdays: [0] } : {};
  const reply = await executeIntent(actor, { kind: 'create_training', args }, 'ar', 'secret', now, player);
  expect(reply).toEqual({ kind: 'message', text: 'مش قادر أعمل البرنامج دلوقتي، جرّب من مولّد البرامج في صفحة اللاعب.' });
});
