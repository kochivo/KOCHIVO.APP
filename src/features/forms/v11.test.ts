import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { V11QuestionPreview } from './components/v11-question-preview';
import { questionTypeLabel } from './components/v11-question-type';
import type { Question } from './types';

const question: Question = { id: 'q', form_id: 'f', position: 0, label_ar: 'السؤال', label_en: 'Question',
  type: 'text', required: true, options: [{ value: 'good', label_ar: 'كويس', label_en: 'Good' }], maps_to: null, alert_on: null };

it.each([['number', 'رقم'], ['text', 'كتابة'], ['choice', 'اختيار'], ['scale', 'تقييم 1–10'], ['photos', 'صور']] as const)
('labels the %s question without changing its stored meaning', (type, label) => {
  expect(questionTypeLabel(type, 'ar')).toBe(label);
});

it.each([['number', 'type="number"'], ['text', '<textarea'], ['choice', 'Good'], ['scale', '>10<'], ['photos', 'Front'], ['multi', 'checkbox'], ['yesno', 'Yes']] as const)
('previews the stored %s answer control', (type, expected) => {
  const html = renderToStaticMarkup(createElement(V11QuestionPreview, { question: { ...question, type }, locale: 'en' }));
  expect(html).toContain(expected);
  expect(html).toContain('Question');
});
