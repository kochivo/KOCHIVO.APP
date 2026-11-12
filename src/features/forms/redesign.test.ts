import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { copyTemplate, validateForm } from './model';
import { templates } from './templates';
import { QuestionField } from './components/question-field';
import { questionCaption } from './question-caption';

it('accepts optional English and renders Arabic for an English player', () => {
  const form = copyTemplate(templates[0], 'captain');
  const q = { ...form.questions[0], label_en: '' } as typeof form.questions[number];
  expect(validateForm({ ...form, questions: [q] })).toEqual([]);
  expect(renderToStaticMarkup(createElement(QuestionField, { question: q, locale: 'en' }))).toContain(q.label_ar);
});

it('keeps chart preference in template copies with independent question objects', () => {
  const template = structuredClone(templates[0]);
  const question = template.questions[0];
  if (!question) throw new Error('Missing question');
  question.show_chart = false;
  const form = copyTemplate(template, 'captain');
  expect(form.questions[0]).toHaveProperty('show_chart', false);
  expect(form.questions[0]).not.toBe(template.questions[0]);
});

it('uses compact starter captions without hiding the text of custom questions', () => {
  const q = copyTemplate(templates[0], 'captain').questions[0];
  if (!q) throw new Error('Missing question');
  expect(questionCaption(q, 'checkin', 'ar')).toBe('الوزن');
  expect(questionCaption({ ...q, label_ar: 'وزنك قبل البطولة؟', label_en: '' }, 'checkin', 'en')).toBe('وزنك قبل البطولة؟');
});
