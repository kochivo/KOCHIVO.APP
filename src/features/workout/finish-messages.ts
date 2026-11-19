import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './finish-messages-standard';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { complete: 'خلّصت {day}', title: 'آخر التمرين', 'stats.one': "{minutes} دقيقة · مجموعة واحدة · {volume} كجم", 'stats.two': "{minutes} دقيقة · مجموعتين · {volume} كجم", 'stats.few': "{minutes} دقيقة · {sets} مجموعات · {volume} كجم", 'stats.many': "{minutes} دقيقة · {sets} مجموعة · {volume} كجم", 'stats.other': "{minutes} دقيقة · {sets} مجموعة · {volume} كجم",
    points: 'نقط', records: 'رقم قياسي', effort: 'التمرين كان عامل إيه؟', effortHint: 'قيّم مجهودك من 1 لـ 10',
    easy: 'سهل جدًا', maximum: 'أقصى مجهود', send: 'ابعت للكابتن', share: 'شارك', shareError: 'المشاركة متعملتش. جرّب تاني.' },
  en: { complete: 'Finished {day}', title: 'Workout complete', 'stats.one': "{minutes} min · {sets} set · {volume} kg", 'stats.other': "{minutes} min · {sets} sets · {volume} kg",
    points: 'Points', records: 'Personal records', effort: 'How was your workout?', effortHint: 'Rate your effort from 1 to 10',
    easy: 'Very easy', maximum: 'Maximum effort', send: 'Send to coach', share: 'Share', shareError: 'Could not share. Try again.' },
});
