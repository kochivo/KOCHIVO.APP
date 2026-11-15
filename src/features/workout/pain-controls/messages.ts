import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: { open: 'عندي وجع', rest: 'الكابتن قال ريّح ده الأسبوع ده', reduced: 'الكابتن قلّل الوزن 20%: {weight}', skip: 'عدّي التمرين ده' },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? { open: 'أشعر بألم', rest: 'المدرب طلب إراحة هذا التمرين هذا الأسبوع', reduced: 'المدرب خفّض الوزن 20%: {weight}', skip: 'تخطّ هذا التمرين' } as const : undefined; },
  en: { open: "I'm in pain", rest: 'Your coach said to rest this exercise this week', reduced: 'Coach reduced load 20%: {weight}', skip: 'Skip this exercise' },
});
