import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { QuestionField } from './components/question-field';
import { validAnswer } from './answers';
import { newQuestion } from './model';
import { customFormQuestionTypes } from '@/types/enums';

it.each(customFormQuestionTypes)('renders %s read-only in either player language', type => {
  const question = { ...newQuestion('form', 0, () => 'question'), label_ar: 'السؤال', label_en: 'Question', type,
    options: [{ value: 'one', label_ar: 'الأول', label_en: 'First' }], required: true };
  for (const locale of ['ar','en'] as const) {
    const markup = renderToStaticMarkup(createElement(QuestionField, { question, locale, readOnly: true }));
    expect(markup).toContain('<fieldset'); expect(markup).toContain('disabled=""');
    expect(markup).toContain(locale === 'ar' ? 'السؤال' : 'Question');
    if (type === 'choice' || type === 'multi') expect(markup).toContain(locale === 'ar' ? 'الأول' : 'First');
    if (type === 'photos') expect(markup).toContain('type="file"');
    if (type === 'scale') { expect(markup).toContain('min="1"'); expect(markup).toContain('max="10"'); }
  }
});

it.each(['choice','yesno','photos'] as const)('marks required %s fields for player validation', type => {
  const question = { ...newQuestion('form', 0, () => 'question'), type, required: true,
    options: [{ value: 'one', label_ar: 'الأول', label_en: 'First' }] };
  expect(renderToStaticMarkup(createElement(QuestionField, { question, locale: 'en' }))).toContain('required=""');
});

it('validates required multi-selects as a group and describes the group error', () => {
  const question = { ...newQuestion('form', 0, () => 'question'), type: 'multi' as const, required: true,
    options: [{ value: 'a', label_ar: 'أ', label_en: 'First' }, { value: 'b', label_ar: 'ب', label_en: 'Second' }] };
  expect(validAnswer(question, [])).toBe(false);
  expect(validAnswer(question, ['b'])).toBe(true);
  const markup = renderToStaticMarkup(createElement(QuestionField, { question, locale: 'en', groupError: 'Select at least one', promptRef: () => {} }));
  expect(markup).not.toContain('required=""');
  const id = markup.match(/aria-describedby="([^"]+)"/)?.[1];
  expect(id).toBeTruthy();
  expect(markup).toContain(`id="${id}" role="alert"`);
  expect(markup).toContain('<legend tabindex="-1"');
});
