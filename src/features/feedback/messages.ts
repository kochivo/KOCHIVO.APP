import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/messages';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    report: 'بلّغ عن مشكلة', problem: 'إيه المشكلة؟', send: 'ابعت', sending: 'بنبعت',
    thanks: 'وصلتنا، شكراً', failed: 'الإرسال فشل. جرّب تاني.',
    validation: 'اكتب من 5 لـ1000 حرف.', close: 'اقفل',
  },
  en: {
    report: 'Report a problem', problem: "What's the problem?", send: 'Send', sending: 'Sending',
    thanks: 'We got it, thanks', failed: 'Sending failed. Try again.',
    validation: 'Write 5–1000 characters.', close: 'Close',
  },
});
