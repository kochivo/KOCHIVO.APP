import { defineMessages } from '@/core/i18n/messages';

import { arStd } from './standard/messages';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    waitingForPlans: 'مستني الأنظمة',
    unfreezeFirst: 'فكّ التجميد الأول',
    pending: 'مستني التفعيل', frozen: 'متجمّد',
    waiting: 'بياناتك وصلت للكابتن. مستني يوافق ويحدد الباقة.',
    frozenBody: 'الاشتراك متجمّد. أيامك وحصصك محفوظة. كلّم الكابتن عشان يفكّه.',
    byDays: 'بالأيام', bySessions: 'بالحصص', kind: 'نوع الباقة', quantity: 'العدد',
    activate: 'فعّل اللاعب', close: 'اقفل', package: 'الباقة', custom: 'باقة مخصصة',
    price: 'السعر بالجنيه', paid: 'المدفوع بالجنيه', trial: 'تجربة مجانية',
    'sessionsLeft.one': 'فاضل حصة واحدة', 'sessionsLeft.two': 'فاضل حصتين',
    'sessionsLeft.few': 'فاضل {count} حصص', 'sessionsLeft.other': 'فاضل {count} حصة', daysLeft: 'باقي {count} يوم',
    freeze: 'جمّد الاشتراك', unfreeze: 'فك التجميد', confirm: 'متأكد من تغيير حالة التجميد؟',
    renew: 'جدّد / زوّد', loading: 'بنحمّل الاشتراك…', error: 'التغيير متسجلش. جرّب تاني',
    retry: 'جرّب تاني', validity: 'الحصص المخصصة صالحة لمدة ٦٠ يوم',
  },
  en: {
    waitingForPlans: 'Waiting for plans',
    unfreezeFirst: 'Unfreeze first',
    pending: 'Awaiting activation', frozen: 'Frozen',
    waiting: 'Your details reached the coach; waiting for approval and a package.',
    frozenBody: 'Subscription frozen; your days and sessions are saved. Contact the coach to unfreeze.',
    byDays: 'By days', bySessions: 'By sessions', kind: 'Package type', quantity: 'Quantity',
    activate: 'Activate player', close: 'Close', package: 'Package', custom: 'Custom package',
    price: 'Price (EGP)', paid: 'Paid (EGP)', trial: 'Free trial',
    'sessionsLeft.one': '{count} session left', 'sessionsLeft.other': '{count} sessions left', daysLeft: '{count} days left',
    freeze: 'Freeze subscription', unfreeze: 'Unfreeze', confirm: 'Change the freeze status?',
    renew: 'Renew / top up', loading: 'Loading subscription…', error: 'Could not save. Try again',
    retry: 'Try again', validity: 'Custom sessions are valid for 60 days',
  },
});
