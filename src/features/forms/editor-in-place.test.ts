import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { V11QuestionCard } from './components/v11-question-card';
import type { Question } from './types';

const question: Question = { id: 'q', form_id: 'f', position: 0, label_ar: 'وزنك؟', label_en: 'Weight?', type: 'number', required: true, options: [], maps_to: 'weight', alert_on: null };
const props = { question, locale: 'en' as const, index: 0, count: 2, onToggle() {}, onChange() {}, onDelete() {}, onMove() {}, onDuplicate() {} };

it('renders only the expanded question editor in a list of cards', () => {
  const html = renderToStaticMarkup(createElement('div', null,
    createElement(V11QuestionCard, { ...props, open: false }),
    createElement(V11QuestionCard, { ...props, question: { ...question, id: 'second' }, index: 1, open: true })));
  expect(html.match(/aria-expanded="true"/g)).toHaveLength(1);
  expect(html.match(/<button[^>]*aria-expanded="false"/g)).toHaveLength(1);
  expect(html.match(/aria-label="Question in Arabic"/g)).toHaveLength(1);
  expect(html).toContain('Move question up');
  expect(html).toContain('Move question down');
});

it('keeps every stored answer type and advanced rules accessible in the open card', () => {
  const html = renderToStaticMarkup(createElement(V11QuestionCard, { ...props, open: true }));
  for (const label of ['Number', 'Text', 'Choice', 'Multiple choice', 'Yes or no', 'Photos', 'Weight', 'Alert me if the answer needs attention']) expect(html).toContain(label);
  expect(html).toContain('aria-label="Delete question"');
});
