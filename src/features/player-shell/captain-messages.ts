import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/captain-messages';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { captain: 'كابتن {name}', since: 'كابتنك من {duration}', pending: 'الكابتن مستني منك {title}',
    questions: '{n} أسئلة · {min} دقايق', estimated: '{n} أسئلة · حوالي {min} دقايق',
    failed: 'مش قادرين نحمّل الاستبيان', retry: 'جرّب تاني', assessments: 'كل التقييمات',
    placeholder: 'اكتب للكابتن', thread: 'الرسايل',
    sinceToday: 'كابتنك من النهارده', day: 'يوم', twoDays: 'يومين', days: '{n} أيام', month: 'شهر', twoMonths: 'شهرين', months: '{n} شهور',
    year: 'سنة', twoYears: 'سنتين', years: '{n} سنين' },
  en: { captain: 'Coach {name}', since: 'Your coach for {duration}', pending: 'Your coach is waiting for {title}',
    questions: '{n} questions · {min} min', estimated: '{n} questions · about {min} min',
    failed: 'Could not load assessment', retry: 'Try again', assessments: 'All assessments',
    placeholder: 'Write to your coach', thread: 'Messages',
    sinceToday: 'Your coach since today', day: 'one day', twoDays: 'two days', days: '{n} days', month: 'one month', twoMonths: 'two months', months: '{n} months',
    year: 'one year', twoYears: 'two years', years: '{n} years' },
});
