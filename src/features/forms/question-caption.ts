import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { messages } from './redesign/messages';
import { messages as formMessages } from './messages';
import type { FormDraft, Question } from './types';

export function questionCaption(q: Question, kind: FormDraft['kind'], locale: Locale, style?: ArabicStyle): string {
  const t = createT(messages, locale, style);
  const captions = { weight: 'weight', waist: 'waist', sleep: 'sleep', adherence: 'adherence', note: 'noteShort' } as const;
  for (const key of Object.keys(captions) as (keyof typeof captions)[]) {
    if (q.label_ar === formMessages.ar.labels[key]) return t(captions[key]);
  }
  if (q.label_ar === formMessages.ar.labels.photos && kind === 'checkin') return t('photosShort');
  return locale === 'ar' ? q.label_ar : q.label_en || q.label_ar;
}
