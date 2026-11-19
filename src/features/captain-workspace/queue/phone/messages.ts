import { defineMessages } from '@/core/i18n/messages';

const arStd = {
  waiting: '{count} بانتظارك', done: 'راجعت {count}', later: 'لاحقًا', previous: 'السابق', next: 'التالي',
  position: '{current} من {total}', approveReply: 'وافق وأرسل الرد', profile: 'ملف اللاعب',
  search: 'ابحث عن لاعب', inbox: 'صندوق الوارد', waist: 'محيط الخصر', sleep: 'متوسط النوم', "hours.one": "ساعة واحدة", "hours.two": "ساعتين", "hours.few": "{value} ساعات", "hours.many": "{value} ساعةً", "hours.other": "{value} ساعة",
  reply: 'اكتب ردًا', noMatches: 'لا توجد مهام مطابقة.',
} as const;

export const phoneTaskMessages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    waiting: '{count} مستنياك', done: 'راجعت {count}', later: 'بعدين', previous: 'السابق', next: 'التالي',
    position: '{current} من {total}', approveReply: 'وافق وابعت الرد', profile: 'ملف اللاعب',
    search: 'دوّر على لاعب', inbox: 'صندوق الوارد', waist: 'محيط الوسط', sleep: 'متوسط النوم', "hours.one": "ساعة واحدة", "hours.two": "ساعتين", "hours.few": "{value} ساعات", "hours.many": "{value} ساعة", "hours.other": "{value} ساعة",
    reply: 'اكتب رد', noMatches: 'مفيش مهام مطابقة.',
  },
  en: {
    waiting: '{count} waiting', done: '{count} reviewed', later: 'Later', previous: 'Previous', next: 'Next',
    position: '{current} of {total}', approveReply: 'Approve and reply', profile: 'Player profile',
    search: 'Find a player', inbox: 'Inbox', waist: 'Waist', sleep: 'Average sleep', "hours.one": "{value} h", "hours.other": "{value} h",
    reply: 'Write a reply', noMatches: 'No matching tasks.',
  },
});

// The i18n gating test reads every messages.ts by this name.
export { phoneTaskMessages as messages };
