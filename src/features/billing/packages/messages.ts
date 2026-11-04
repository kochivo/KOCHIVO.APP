import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    pending: 'مستني التفعيل', frozen: 'متجمّد',
    waiting: 'بياناتك وصلت للكابتن. مستني يوافق ويحدد الباقة.',
    frozenBody: 'الاشتراك متجمّد. أيامك وحصصك محفوظة. كلّم الكابتن عشان يفكّه.',
    byDays: 'بالأيام', bySessions: 'بالحصص', kind: 'نوع الباقة', quantity: 'العدد',
    activate: 'فعّل اللاعب', close: 'اقفل', package: 'الباقة', custom: 'باقة مخصصة',
    price: 'السعر بالجنيه', paid: 'المدفوع بالجنيه', trial: 'تجربة مجانية',
    sessionsLeft: 'فاضل {count} حصص', daysLeft: 'باقي {count} يوم',
    freeze: 'جمّد الاشتراك', unfreeze: 'فك التجميد', confirm: 'متأكد من تغيير حالة التجميد؟',
    renew: 'جدّد / زوّد', loading: 'بنحمّل الاشتراك…', error: 'التغيير متسجلش. جرّب تاني',
    retry: 'جرّب تاني', validity: 'الحصص المخصصة صالحة لمدة ٦٠ يوم',
  },
  en: {
    pending: 'Awaiting activation', frozen: 'Frozen',
    waiting: 'Your details reached the coach; waiting for approval and a package.',
    frozenBody: 'Subscription frozen; your days and sessions are saved. Contact the coach to unfreeze.',
    byDays: 'By days', bySessions: 'By sessions', kind: 'Package type', quantity: 'Quantity',
    activate: 'Activate player', close: 'Close', package: 'Package', custom: 'Custom package',
    price: 'Price (EGP)', paid: 'Paid (EGP)', trial: 'Free trial',
    sessionsLeft: '{count} sessions left', daysLeft: '{count} days left',
    freeze: 'Freeze subscription', unfreeze: 'Unfreeze', confirm: 'Change the freeze status?',
    renew: 'Renew / top up', loading: 'Loading subscription…', error: 'Could not save. Try again',
    retry: 'Try again', validity: 'Custom sessions are valid for 60 days',
  },
});
