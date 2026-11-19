import { expect, it } from 'vitest';
import { guardAnswer, reviewAnswer } from './data/answer-guard';

const facts = '[progress] done ١٣, adherence 86.5%, last workout 2026-11-19';

it.each([
  ['عملت ۱۳ تمرين والتزامك ٨٦٫٥٪.', '', null],
  ['You asked about 250 points. You trained 13 times.', 'Do I have 250 points?', null],
  ['You’ve done 3 sets.', '', null],
  ['You’ve done 130 workouts.', '', 'number'],
  ['You’ve done -13 workouts.', '', 'number'],
  ['You’ve done 1e3 workouts.', '', 'number'],
  ['You’ve done 86.55% of workouts.', '', 'number'],
  ['حفظت التمرين.', '', 'action_claim'],
  ['اتسجّل التمرين.', '', 'action_claim'],
  ['I have saved your workout.', '', 'action_claim'],
  ['Check example.com/workout.', '', 'link'],
  ['Call +20 101 234 5678.', '', 'phone'],
  ['Your last workout was 2026-11-19.', '', null],
  ['x'.repeat(701), '', 'length'],
] as const)('checks %s against the facts and user text', (text, userText, reason) => {
  expect(guardAnswer(text, facts, userText)).toBe(reason);
});

it('accepts a me citation and uses clarify if the source is missing', () => {
  const args = { text: 'أيوه يا نور.', sources: ['me'] as const };
  const answer = { ...args, sources: [...args.sources] };
  expect(reviewAnswer(answer, '[me] Name: Nour Ali; role: player', 'عارفني؟')).toEqual({ ok: true, ...answer });
  expect(reviewAnswer(answer, facts, 'عارفني؟')).toMatchObject({
    ok: false, reason: 'source', fallback: { kind: 'clarify', reason: 'answer' },
  });
});
