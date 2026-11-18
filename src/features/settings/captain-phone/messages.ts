import { defineMessages } from '@/core/i18n/messages';

const arStd = {
  edit: 'عدّل', publicOn: 'منشورة', publicOff: 'غير منشورة', invite: 'رابط الدعوة',
  inviteLinks: 'أنشئ رابط دعوة للاعب وانسخه', copy: 'انسخ', notifications: 'الإشعارات',
  language: 'اللغة والوقت', languageAndZone: '{language} · {zone}',
  subscription: 'باقة KOCHIVO', security: 'الأمان', back: 'العودة إلى الإعدادات',
} as const;

export const messages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    edit: 'عدّل', publicOn: 'شغالة', publicOff: 'مش منشورة', invite: 'لينك الدعوة',
    inviteLinks: 'اعمل لينك دعوة للاعب وانسخه', copy: 'انسخ', notifications: 'الإشعارات',
    language: 'اللغة والوقت', languageAndZone: '{language} · {zone}',
    subscription: 'باقة KOCHIVO', security: 'الأمان', back: 'ارجع للإعدادات',
  },
  en: {
    edit: 'Edit', publicOn: 'Live', publicOff: 'Unpublished', invite: 'Invite link',
    inviteLinks: 'Create and copy a player invite link', copy: 'Copy', notifications: 'Notifications',
    language: 'Language and time', languageAndZone: '{language} · {zone}',
    subscription: 'KOCHIVO plan', security: 'Security', back: 'Back to settings',
  },
});
