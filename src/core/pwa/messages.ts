import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? {
    offlineGeneric: 'أنت غير متصل بالإنترنت.',
    offlineCaptain: 'لا يوجد اتصال الآن. عند عودته يمكنك متابعة لاعبيك وتعديل البرامج.',
    todaySWorkoutIsSavedOn: 'تمرين اليوم محفوظ على هاتفك وسيُرسل عند عودة الاتصال.',
  } as const : undefined; },
  ar: {
    offlineGeneric: 'إنت مش متصل بالنت.',
    offlineCaptain: 'مفيش نت دلوقتي. أول ما يرجع هتقدر تتابع لاعيبتك وتعدّل البرامج.',
    todaySWorkoutIsSavedOn: 'تمرين النهارده متسجّل على موبايلك وهيتبعت أول ما النت يرجع.',
  },
  en: {
    offlineGeneric: "You're offline.",
    offlineCaptain: "You're offline. Reconnect to follow your players and update programs.",
    todaySWorkoutIsSavedOn: "Today's workout is saved on your phone and will sync when you're back online.",
  },
});
