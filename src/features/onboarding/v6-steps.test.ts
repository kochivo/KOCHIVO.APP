import { expect, it } from 'vitest';
import { questions, optionalQuestions, questionValid } from './v6-steps';

it('keeps every intake field in the single-question flow and validates with existing rules', () => {
  expect(questions).toHaveLength(13);
  expect(new Set(questions).size).toBe(13);
  expect(optionalQuestions).not.toContain('sex');
  const now = new Date('2026-11-12T10:00:00Z');
  expect(questionValid('birth_year', { birth_year: 2020 }, now)).toBe(false);
  expect(questionValid('training_days', { training_days: [] }, now)).toBe(false);
  expect(questionValid('injuries', { injuries: ['none', 'knee'] }, now)).toBe(false);
  expect(questionValid('notes', { notes: null }, now)).toBe(true);
  expect(questionValid('session_minutes', { session_minutes: 45 }, now)).toBe(true);
});
