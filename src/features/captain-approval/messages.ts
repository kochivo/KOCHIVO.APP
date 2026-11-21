import { defineMessages } from '@/core/i18n/messages';

import { arStd } from './standard/messages';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    checkFailed: 'مش قادرين نراجع حالة طلبك', retry: 'جرّب تاني',
    title: 'حسابك تحت المراجعة', rejectedTitle: 'طلبك ماتقبلش',
    pending: 'أهلاً بيك في KOCHIVO. حسابك تحت المراجعة من فريقنا، وهنبعتلك إشعار أول ما يتفعّل.',
    rejected: 'للأسف طلبك ماتقبلش. لو شايف إن ده غلط كلّمنا.',
    support: 'كلّمنا على واتساب',
    wait: 'المراجعة بتاخد لحد 24 ساعة.', demo: 'جرّب الديمو لحد ما حسابك يتقبل', waitSupport: 'عايز تستعجل؟ كلّمنا على واتساب',
  },
  en: {
    checkFailed: 'Could not check approval', retry: 'Try again',
    title: 'Account under review', rejectedTitle: 'Request not accepted',
    pending: "Welcome to KOCHIVO. Your account is under review. We'll notify you when it's approved.",
    rejected: "Unfortunately your request wasn't accepted. If you think this is a mistake, contact us.",
    support: 'Contact us on WhatsApp',
    wait: 'Review takes up to 24 hours.', demo: 'Try the demo while your account is reviewed', waitSupport: 'In a hurry? Message us on WhatsApp',
  },
});
