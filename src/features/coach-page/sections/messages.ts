import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    spotsLeft: 'فاضل {count} أماكن', full: 'مفيش أماكن دلوقتي', waitlist: 'بلّغني لما يفضى مكان',
    waitlisted: 'إنت في قايمة الانتظار', players: 'لاعب بيتمرن معاه دلوقتي', workouts: 'تمرين اتسجّل في التطبيق',
    adherence: 'متوسط التزام لاعيبته', years: 'سنين خبرة', languages: 'اللغات', ar: 'عربي', en: 'إنجليزي',
    honesty: 'الأرقام بتتحسب من تطبيق كوتشيفو نفسه، مش مكتوبة بإيد الكابتن',
    pending: 'بنضيفك…', failure: 'مش قادرين نضيفك لقايمة الانتظار. جرّب تاني', member: 'انت مشترك مع الكابتن ده بالفعل.',
  },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? {
    spotsLeft: 'متبقي {count} أماكن', full: 'لا توجد أماكن حالياً', waitlist: 'أبلغني عند توفر مكان',
    waitlisted: 'أنت في قائمة الانتظار', players: 'لاعب يتدرّب معه الآن', workouts: 'تمرين مسجّل في التطبيق',
    adherence: 'متوسط التزام اللاعبين', years: 'سنوات الخبرة', languages: 'اللغات', ar: 'العربية', en: 'الإنجليزية',
    honesty: 'الأرقام محسوبة من تطبيق كوتشيفو نفسه، وليست مكتوبة بيد الكابتن',
    pending: 'جارٍ الإضافة…', failure: 'تعذرت إضافتك لقائمة الانتظار. حاول مرة أخرى', member: 'أنت مشترك مع هذا الكابتن بالفعل.',
  } as const : undefined; },
  en: {
    spotsLeft: '{count} spots left', full: 'No spots available now', waitlist: 'Notify me when a spot opens',
    waitlisted: 'You are on the waitlist', players: 'Players training now', workouts: 'Workouts logged in the app',
    adherence: 'Average player adherence', years: 'Years of experience', languages: 'Languages', ar: 'Arabic', en: 'English',
    honesty: 'These numbers are calculated by the KOCHIVO app.',
    pending: 'Joining…', failure: 'Could not join the waitlist. Try again', member: 'You already train with this coach.',
  },
});
