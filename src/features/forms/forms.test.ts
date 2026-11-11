import { expect, it } from 'vitest';
import { copyTemplate, reorderQuestions, validateForm } from './model';
import { templates } from './templates';

it('copies every template with fresh form/question ids and preserves positions', () => {
  let id = 0;
  for (const template of templates) {
    const form = copyTemplate(template, 'captain', () => `new-${++id}`);
    expect(validateForm(form)).toEqual([]);
    expect(form.questions.map(q => q.position)).toEqual(template.questions.map(q => q.position));
    expect(form.questions.every(q => q.form_id === form.id && q.id.startsWith('new-'))).toBe(true);
    expect(new Set([form.id, ...form.questions.map(q => q.id)]).size).toBe(form.questions.length + 1);
    expect(form.questions[0]).not.toBe(template.questions[0]);
  }
});

it('requires a title, questions and compatible fact types', () => {
  const form = copyTemplate(templates[0], 'captain', () => 'id');
  expect(validateForm({ ...form, title: ' ', questions: [] })).toEqual(['title', 'questions']);
  const first = form.questions[0];
  if (!first) throw new Error('Expected template question');
  expect(validateForm({ ...form, questions: [{ ...first, type: 'scale', maps_to: 'weight' }] })).toContain('mapping');
  expect(validateForm({ ...form, questions: [{ ...first, type: 'text', maps_to: 'injuries' }] })).toContain('mapping');
});

it('reorders without mutating input, renumbers positions and ignores invalid moves', () => {
  const form = copyTemplate(templates[0], 'captain', (() => { let i = 0; return () => `${++i}`; })());
  const original = form.questions.map(q => q.id);
  const next = reorderQuestions(form.questions, 0, 1);
  expect(next.map(q => q.id)).toEqual([original[1], original[0], ...original.slice(2)]);
  expect(next.map(q => q.position)).toEqual(next.map((_, i) => i));
  expect(form.questions.map(q => q.id)).toEqual(original);
  expect(reorderQuestions(form.questions, 0, -1)).toEqual(form.questions);
});
