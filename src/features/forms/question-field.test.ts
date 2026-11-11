import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { QuestionField } from './components/question-field';
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
