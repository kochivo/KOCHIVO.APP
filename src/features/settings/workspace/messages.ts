import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard-messages';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    profile: 'ملفك وصفحتك', name: 'الاسم', page: 'رابط صفحتك', whatsapp: 'واتساب', edit: 'عدّل',
    arabic: 'عربي', preferences: 'اللغة والتوقيت', language: 'اللغة', english: 'English',
    timezone: 'التوقيت', auto: 'تلقائي · {zone}', cairo: 'القاهرة', manual: 'اختار بنفسي', units: 'الوحدات',
    metric: 'كجم · سم', imperial: 'lb · in', invite: 'رسالة الدعوة', editInvite: 'عدّل الرسالة',
    invitePreview: '«أهلًا! ده لينك تنضم بيه لفريقي على KOCHIVO…»', account: 'حسابك',
    download: 'نزّل بياناتك', downloadAction: 'نزّل', signOut: 'اخرج من الحساب', signOutAction: 'خروج',
    delete: 'امسح الحساب', deleteAction: 'امسح', more: 'اختيارات إضافية', close: 'اقفل',
    saved: 'محفوظ', saving: 'بيتحفظ…', error: 'الحفظ متعملش. جرّب تاني', retry: 'جرّب تاني', unset: 'لسه متضافش',
  },
  en: {
    profile: 'Profile and page', name: 'Name', page: 'Your page', whatsapp: 'WhatsApp', edit: 'Edit',
    arabic: 'عربي', preferences: 'Language and timezone', language: 'Language', english: 'English',
    timezone: 'Timezone', auto: 'Automatic · {zone}', cairo: 'Cairo', manual: 'Choose manually', units: 'Units',
    metric: 'kg · cm', imperial: 'lb · in', invite: 'Invite message', editInvite: 'Edit message',
    invitePreview: '“Hi! Join my team on KOCHIVO…”', account: 'Your account',
    download: 'Download your data', downloadAction: 'Download', signOut: 'Sign out', signOutAction: 'Sign out',
    delete: 'Delete account', deleteAction: 'Delete', more: 'More options', close: 'Close',
    saved: 'Saved', saving: 'Saving…', error: "Couldn't save. Try again", retry: 'Try again', unset: 'Not set yet',
  },
});
