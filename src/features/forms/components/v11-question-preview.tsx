'use client';
import { useState } from 'react';
import { Camera } from 'lucide-react';
import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { workspaceMessages } from '../messages';
import type { Question } from '../types';
import { QuestionField } from './question-field';
import type { QuestionValue } from './question-field';

export function V11QuestionPreview({ question, locale, style }: { question: Question; locale: Locale; style?: ArabicStyle }) {
  const [value, setValue] = useState<QuestionValue>(null), t = createT(workspaceMessages, locale, style);
  if (question.type === 'photos') return <div className="space-y-card-gap">
    <h2 className="text-md font-semibold">{locale === 'ar' ? question.label_ar : question.label_en || question.label_ar}</h2>
    <div className="grid grid-cols-2 gap-inline">{(['front', 'side'] as const).map(view => <label key={view} className="glass flex min-h-32 cursor-pointer flex-col items-center justify-center gap-inline rounded-control border border-dashed border-line text-muted">
      <Camera aria-hidden className="size-5" />{t(view)}<input type="file" accept="image/*" aria-label={t(view)} className="sr-only" />
    </label>)}</div>
  </div>;
  if (question.type === 'text') return <label className="block space-y-stack text-md font-semibold">
    <span>{locale === 'ar' ? question.label_ar : question.label_en || question.label_ar}</span>
    <textarea placeholder={t('write')} value={typeof value === 'string' ? value : ''} onChange={e => setValue(e.target.value)}
      className="min-h-24 w-full resize-none rounded-control border border-line bg-transparent p-stack text-sm font-normal" />
  </label>;
  return <QuestionField question={question} locale={locale} style={style} preview value={value} onChange={setValue} />;
}
