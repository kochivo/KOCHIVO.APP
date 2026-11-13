import { expect, it } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './redesign/messages';

it('counts questions with the right Arabic and English plural', () => {
  const ar = createT(messages, 'ar'), en = createT(messages, 'en');
  expect(ar('questions', { n: 1, list: 'الوزن' })).toBe('سؤال واحد: الوزن');
  expect(ar('questions', { n: 2, list: 'أ' })).toBe('سؤالين: أ');
  expect(ar('questions', { n: 3, list: 'أ' })).toBe('3 أسئلة: أ');
  expect(ar('questions', { n: 12, list: 'أ' })).toBe('12 سؤال: أ');
  expect(en('questions', { n: 1, list: 'Weight' })).toBe('1 question: Weight');
  expect(en('questions', { n: 4, list: 'A' })).toBe('4 questions: A');
});
