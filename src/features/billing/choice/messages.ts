import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard-messages';
export const messages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    unfreezeFirst: 'فك تجميد اللاعب الأول',
    year: 'سنة',
    title: 'اختار باقتك مع كابتن {name}', hint: 'تقدر تغيّر باقتك وقت التجديد', popular: 'الأكثر طلبًا',
    currency: 'جنيه', monthly: 'شهرك بـ {price} جنيه بس', excluded: 'العرض مش على الفئة دي', choose: 'اختار {tier}',
    days: '{count} يوم', months: '{count} شهور', month: 'شهر', remaining: '{days} يوم · {hours} ساعة', ended: 'العرض خلص',
    empty: 'لسه مفيش باقات متاحة', loading: 'بنحمّل…', error: 'الطلب متعملش. جرّب تاني', retry: 'جرّب تاني',
    renewal: 'طلب تجديد', sent: 'طلب التجديد اتبعت للكابتن', pending: 'طلب تجديد مستني الموافقة', cancel: 'إلغاء الطلب',
    approve: 'وافق', decline: 'ارفض', requests: 'طلبات التجديد', noRequests: 'لسه مفيش طلبات تجديد',
    expired: 'العرض خلص، السعر رجع عادي', saved: 'القرار اتحفظ', renew: 'جدّد باقتك', back: 'اقفل',
    bonus: '{days} يوم هدية',
    percentOffer: 'خصم {value}% على باقات {durations}', amountOffer: 'خصم {value} جنيه على باقات {durations}',
    bonusOffer: '{value} يوم هدية على باقات {durations}', durationSeparator: ' و',
  },
  en: {
    unfreezeFirst: 'Unfreeze the player first',
    year: '1 year',
    title: 'Choose your plan with Captain {name}', hint: 'You can change your plan when you renew', popular: 'Most popular',
    currency: 'EGP', monthly: 'Only EGP {price} per month', excluded: 'Offer does not cover this tier', choose: 'Choose {tier}',
    days: '{count} days', months: '{count} months', month: '1 month', remaining: '{days} days · {hours} hours', ended: 'Offer ended',
    empty: 'No packages available', loading: 'Loading…', error: 'Request failed. Try again', retry: 'Try again',
    renewal: 'Renewal request', sent: 'Renewal request sent to your captain', pending: 'Renewal awaiting approval', cancel: 'Cancel request',
    approve: 'Approve', decline: 'Decline', requests: 'Renewal requests', noRequests: 'No renewal requests',
    expired: 'Offer ended. Regular price applies', saved: 'Decision saved', renew: 'Renew your plan', back: 'Close',
    bonus: '{days} bonus days',
    percentOffer: '{value}% off {durations} packages', amountOffer: 'EGP {value} off {durations} packages',
    bonusOffer: '{value} bonus days on {durations} packages', durationSeparator: ' and ',
  },
});
