import { defineMessages } from '@/core/i18n/messages';

const arStd = { switch: 'بدّل التمرين', original: 'التمرين الأساسي', empty: 'البدائل غير متاحة الآن',
  target: 'الهدف: {reps}', range: '{min}–{max}', failure: 'للفشل', 'rir.one': " · اترك تكرار واحد",
    'rir.two': " · اترك تكرارين",
    'rir.few': " · اترك {n} تكرارات",
    'rir.many': " · اترك {n} تكرارًا",
    'rir.other': " · اترك {n} تكرار" } as const;
export const messages = defineMessages({
  ar: { switch: 'بدّل التمرين', original: 'التمرين الأساسي', empty: 'البدائل مش متاحة دلوقتي',
    target: 'المطلوب: {reps}', range: '{min}–{max}', failure: 'للفشل', 'rir.one': " · يسيب عدّة واحدة",
    'rir.two': " · يسيب عدّتين",
    'rir.few': " · يسيب {n} عدّات",
    'rir.many': " · يسيب {n} عدّة",
    'rir.other': " · يسيب {n} عدّة" },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  en: { switch: 'Switch exercise', original: 'Original exercise', empty: 'Alternatives unavailable',
    target: 'Target: {reps}', range: '{min}–{max}', failure: 'To failure', 'rir.one': " · Leave {n} rep",
    'rir.other': " · Leave {n} reps" },
});
