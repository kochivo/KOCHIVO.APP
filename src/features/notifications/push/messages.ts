import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/messages';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    title: 'إشعارات على الموبايل',
    loading: 'بنشوف حالة الإشعارات…',
    saving: 'بنغيّر إعداد الإشعارات…',
    unsupported: 'المتصفح ده مش بيدعم إشعارات الموبايل. جرّب متصفح أحدث.',
    install: 'ضيف التطبيق للشاشة الرئيسية الأول، وافتحه من هناك عشان تفعّل الإشعارات.',
    denied: 'الإشعارات مقفولة. على الأندرويد: افتح إعدادات الموبايل ثم التطبيقات ثم KOCHIVO (أو Chrome) ثم الإشعارات واسمح بيها. على الآيفون: الإعدادات ثم الإشعارات ثم KOCHIVO. وبعدها جرّب تاني.',
    on: 'الإشعارات شغّالة على الجهاز ده، حتى والتطبيق مقفول.',
    off: 'فعّل الإشعارات عشان توصلك تحديثات الكابتن وتفكيرة بتمرينك.',
    error: 'مقدرناش نغيّر الإشعارات. اتأكد من النت وجرّب تاني.',
    retry: 'جرّب تاني',
  },
  en: {
    title: 'Mobile notifications',
    loading: 'Checking notifications…',
    saving: 'Updating notifications…',
    unsupported: 'This browser does not support push notifications. Try a newer browser.',
    install: 'Add the app to your home screen first, then open it there to enable notifications.',
    denied: 'Notifications are blocked. On Android: phone Settings, Apps, KOCHIVO (or Chrome), Notifications, and allow them. On iPhone: Settings, Notifications, KOCHIVO. Then try again.',
    on: 'Notifications are on for this device, even when the app is closed.',
    off: 'Get captain updates and a reminder on workout days.',
    error: 'Could not update notifications. Check your connection and try again.',
    retry: 'Try again',
  },
});
