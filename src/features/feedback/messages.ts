import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    report: 'بلّغ عن مشكلة', problem: 'إيه المشكلة؟', send: 'ابعت', sending: 'جاري الإرسال',
    thanks: 'وصلتنا، شكراً', failed: 'الإرسال فشل. جرّب تاني.',
    validation: 'اكتب من 5 لـ1000 حرف.', close: 'اقفل',
  },
  en: {
    report: 'Report a problem', problem: "What's the problem?", send: 'Send', sending: 'Sending',
    thanks: 'We got it, thanks', failed: 'Sending failed. Try again.',
    validation: 'Write 5–1000 characters.', close: 'Close',
  },
});
