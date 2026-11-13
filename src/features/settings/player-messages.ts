import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/player-messages';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { title: 'حسابي', back: 'رجوع', identity: 'بياناتك', coach: 'مع كابتن {name}', coachPlan: 'مع كابتن {name} · {plan}',
    until: 'الاشتراك لحد', sessions: 'تمرين', streak: 'يوم ورا بعض', rank: 'مستواك', settings: 'الإعدادات',
    language: 'اللغة', arabic: 'عربي', english: 'English', theme: 'الشكل', dark: 'غامق', light: 'فاتح',
    reminder: 'فكّرني بالتمرين', reminderTime: 'كل يوم تمرين الساعة {time}', reminderScope: 'مع تحديثات الكابتن على الجهاز ده',
    units: 'الوزن بـ', metric: 'كيلو', imperial: 'رطل', guide: 'ازاي تستخدم التطبيق', more: 'المزيد',
    logout: 'سجّل خروج', soon: 'قريباً', edit: 'تعديل بياناتك', style: 'أسلوب العربي',
    summaryError: 'مش قادرين نحمّل أرقامك', retry: 'جرّب تاني', saveError: 'الحفظ متعملش. جرّب تاني.' },
  en: { title: 'My account', back: 'Back', identity: 'Your details', coach: 'With coach {name}', coachPlan: 'With coach {name} · {plan}',
    until: 'Subscribed until', sessions: 'Workouts', streak: 'Day streak', rank: 'Your rank', settings: 'Settings',
    language: 'Language', arabic: 'عربي', english: 'English', theme: 'Theme', dark: 'Dark', light: 'Light',
    reminder: 'Workout reminders', reminderTime: 'Workout days at {time}', reminderScope: 'Includes coach updates on this device',
    units: 'Weight in', metric: 'kg', imperial: 'lb', guide: 'How to use the app', more: 'More',
    logout: 'Sign out', soon: 'Coming soon', edit: 'Edit your details', style: 'Arabic style',
    summaryError: 'Could not load your stats', retry: 'Try again', saveError: 'Save failed. Try again.' },
});
