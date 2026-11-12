import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: { complete: 'خلّصت {day}', title: 'آخر التمرين', stats: '{minutes} دقيقة · {sets} مجموعات · {volume} كجم',
    points: 'نقط', records: 'رقم قياسي', effort: 'التمرين كان عامل إيه؟', effortHint: 'قيّم مجهودك من 1 لـ 10',
    easy: 'سهل جدًا', maximum: 'أقصى مجهود', send: 'ابعت للكابتن', share: 'شارك', shareError: 'المشاركة متعملتش. جرّب تاني.' },
  en: { complete: 'Finished {day}', title: 'Workout complete', stats: '{minutes} min · {sets} sets · {volume} kg',
    points: 'Points', records: 'Personal records', effort: 'How was your workout?', effortHint: 'Rate your effort from 1 to 10',
    easy: 'Very easy', maximum: 'Maximum effort', send: 'Send to coach', share: 'Share', shareError: 'Could not share. Try again.' },
});
