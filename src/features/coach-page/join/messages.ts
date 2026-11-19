import { defineMessages } from '@/core/i18n/messages';

const arStd = {
  back: 'رجوع', waiting: '{n} بانتظار موافقتك', source: 'من رابط الدعوة',
  start: 'وافق وابدأ', packageLabel: 'الباقة', 'sessions.one': "حصة واحدة",
    'sessions.two': "حصتين",
    'sessions.few': "{n} حصص",
    'sessions.many': "{n} حصة",
    'sessions.other': "{n} حصة",
} as const;

export const joinPhoneMessages = defineMessages({
  ar: {
    back: 'رجوع', waiting: '{n} مستني موافقتك', source: 'من لينك الدعوة',
    start: 'وافق وابدأ', packageLabel: 'الباقة', 'sessions.one': "حصة واحدة",
    'sessions.two': "حصتين",
    'sessions.few': "{n} حصص",
    'sessions.many': "{n} حصة",
    'sessions.other': "{n} حصة",
  },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  en: {
    back: 'Back', waiting: '{n} awaiting approval', source: 'From your invite link',
    start: 'Approve and start', packageLabel: 'Package', 'sessions.one': "{n} session",
    'sessions.other': "{n} sessions",
  },
});
