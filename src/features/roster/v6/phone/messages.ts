import { defineMessages } from '@/core/i18n/messages';

const arStd = {
  'summary.one': "لاعب واحد · تدرب هذا الأسبوع: {trained}",
  'summary.two': "لاعبين · تدرب هذا الأسبوع: {trained}",
  'summary.few': "{total} لاعبين · تدرب هذا الأسبوع: {trained}",
  'summary.many': "{total} لاعبًا · تدرب هذا الأسبوع: {trained}",
  'summary.other': "{total} لاعب · تدرب هذا الأسبوع: {trained}",
  search: 'ابحث عن لاعب',
  noResults: 'لا يوجد لاعب يطابق البحث',
  ending: 'ينتهي قريبًا',
  absent: 'غائب',
  pendingPlan: 'بانتظار خطة',
} as const;

export const phoneMessages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    'summary.one': "لاعب واحد · {trained} اتمرنوا الأسبوع ده",
    'summary.two': "لاعبين · {trained} اتمرنوا الأسبوع ده",
    'summary.few': "{total} لاعبين · {trained} اتمرنوا الأسبوع ده",
    'summary.many': "{total} لاعب · {trained} اتمرنوا الأسبوع ده",
    'summary.other': "{total} لاعب · {trained} اتمرنوا الأسبوع ده",
    search: 'دوّر على لاعب',
    noResults: 'مفيش لاعب مطابق للبحث',
    ending: 'بيخلص',
    absent: 'غايب',
    pendingPlan: 'مستني خطة',
  },
  en: {
    'summary.one': "{total} player · {trained} trained this week",
    'summary.other': "{total} players · {trained} trained this week",
    search: 'Find a player',
    noResults: 'No players match your search',
    ending: 'Expiring',
    absent: 'Absent',
    pendingPlan: 'Needs a plan',
  },
});

// The i18n gating test reads every messages.ts by this name.
export { phoneMessages as messages };
