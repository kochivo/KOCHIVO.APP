'use client';
import { useState } from 'react';
import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { FormDraft } from '../types';
import { formCopy } from '../form-copy';
import { messages as redesign } from '../redesign/messages';
import { QuestionField } from './question-field';
import type { QuestionValue } from './question-field';
import { Button } from '@/ui/button';

export function FormPreview({ form, locale, style }: { form: FormDraft; locale: Locale; style?: ArabicStyle }) {
  const t = createT(redesign, locale, style), [values, setValues] = useState<Record<string, QuestionValue>>({});
  return <div className="glass-strong rounded-[38px] border border-line px-page-x py-page-y">
    <h2 className="mb-stack font-display text-title font-semibold">{form.title}</h2>
    {!form.questions.length && <p className="py-page-y text-faint">{formCopy(locale, style).emptyQuestions}</p>}
    {form.questions.map(question => <QuestionField key={question.id} question={question} locale={locale} style={style} preview
      value={values[question.id] ?? null} onChange={value => setValues({ ...values, [question.id]: value })} />)}
    <Button type="button" disabled variant={'primary'} block={false} className={"mt-stack min-h-12 w-full px-page-x font-semibold"}>{t('submit')}</Button>
  </div>;
}
