import { expect, it } from 'vitest';
import { guardAnswer, reviewAnswer } from './data/answer-guard';

// The card calls the second line `[nutrition]`; the real source id is `nutrition_today`.
const facts = '[progress] done ١٣, adherence 86.5%, last workout 2026-11-19\n'
  + '[nutrition_today] kcal remaining 1800 / target 2500; eaten kcal 1200, protein 80 g, carbs 150 g, fat 40 g';

it.each([
  ['عملت ۱۳ تمرين والتزامك ٨٦٫٥٪.', '', ['progress'], null],
  ['You asked about 250 points. You trained 13 times.', 'Do I have 250 points?', ['progress'], 'number'],
  ['You’ve done 3 sets.', '', ['progress'], null],
  ['You’ve done 130 workouts.', '', ['progress'], 'number'],
  ['You’ve done -13 workouts.', '', ['progress'], 'number'],
  ['You’ve done 1e3 workouts.', '', ['progress'], 'number'],
  ['You’ve done 86.55% of workouts.', '', ['progress'], 'number'],
  ['حفظت التمرين.', '', ['progress'], 'action_claim'],
  ['اتسجّل التمرين.', '', ['progress'], 'action_claim'],
  ['I have saved your workout.', '', ['progress'], 'action_claim'],
  ['Check example.com/workout.', '', ['progress'], 'link'],
  ['Call +20 101 234 5678.', '', ['progress'], 'phone'],
  ['Your last workout was 2026-11-19.', '', ['progress'], null],
  ['x'.repeat(701), '', ['progress'], 'length'],
  ['You have 1800 kcal left today.', '', ['progress'], 'number'],
  ['You have 1800 kcal left today.', '', ['nutrition_today'], null],
  ['You asked about 500 points.', 'Do I have 500 points?', ['progress'], 'number'],
  ['You did 3 sets and 13 workouts this month.', '', ['progress'], null],
  ['You did 13 workouts this month.', '', [], 'number'],
] as const)('checks %s against the facts and user text', (text, userText, sources, reason) => {
  expect(guardAnswer(text, facts, userText, sources)).toBe(reason);
});

it('accepts a me citation and uses clarify if the source is missing', () => {
  const args = { text: 'أيوه يا نور.', sources: ['me'] as const };
  const answer = { ...args, sources: [...args.sources] };
  expect(reviewAnswer(answer, '[me] Name: Nour Ali; role: player', 'عارفني؟')).toEqual({ ok: true, ...answer });
  expect(reviewAnswer(answer, facts, 'عارفني؟')).toMatchObject({
    ok: false, reason: 'source', fallback: { kind: 'clarify', reason: 'answer' },
  });
});

it('falls back to the first cited source when the guard fails on a number', () => {
  const args = { text: 'You have 250 points.', sources: ['progress'] as const };
  const answer = { ...args, sources: [...args.sources] };
  expect(reviewAnswer(answer, facts, 'Do I have 250 points?')).toEqual({
    ok: false, reason: 'number', fallback: { kind: 'my_progress', args: {} },
  });
});
