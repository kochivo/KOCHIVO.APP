import { defineMessages } from '@/core/i18n/messages';

const arStd = { switch: 'بدّل التمرين', original: 'التمرين الأساسي', empty: 'البدائل غير متاحة الآن',
  target: 'الهدف: {reps}', range: '{min}–{max}', failure: 'للفشل', rir: ' · اترك {n} تكرار' } as const;
export const messages = defineMessages({
  ar: { switch: 'بدّل التمرين', original: 'التمرين الأساسي', empty: 'البدائل مش متاحة دلوقتي',
    target: 'المطلوب: {reps}', range: '{min}–{max}', failure: 'للفشل', rir: ' · يسيب {n} عدّة' },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  en: { switch: 'Switch exercise', original: 'Original exercise', empty: 'Alternatives unavailable',
    target: 'Target: {reps}', range: '{min}–{max}', failure: 'To failure', rir: ' · Leave {n} reps' },
});
