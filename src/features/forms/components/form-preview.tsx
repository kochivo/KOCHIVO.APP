'use client';
import { useState } from 'react';
import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { FormDraft } from '../types';
import { formCopy } from '../form-copy';
import { messages as redesign } from '../redesign/messages';
import { QuestionField } from './question-field';
import type { QuestionValue } from './question-field';

export function FormPreview({ form, locale, style }: { form: FormDraft; locale: Locale; style?: ArabicStyle }) {
  const t = createT(redesign, locale, style), [values, setValues] = useState<Record<string, QuestionValue>>({});
  return <div className="glass-strong rounded-[38px] border border-line px-4 py-5">
    <h2 className="mb-3 font-display text-[19px] font-semibold">{form.title}</h2>
    {!form.questions.length && <p className="py-4 text-faint">{formCopy(locale, style).emptyQuestions}</p>}
    {form.questions.map(question => <QuestionField key={question.id} question={question} locale={locale} style={style} preview
      value={values[question.id] ?? null} onChange={value => setValues({ ...values, [question.id]: value })} />)}
    <button type="button" disabled className="mt-3 min-h-12 w-full rounded-full bg-lime px-5 font-semibold text-on-lime">{t('submit')}</button>
  </div>;
}
