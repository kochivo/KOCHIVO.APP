import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard-messages';
export const messages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    unfreezeFirst: 'فك تجميد اللاعب الأول',
    year: 'سنة',
    title: 'اختار باقتك مع كابتن {name}', hint: 'تقدر تغيّر باقتك وقت التجديد', popular: 'الأكثر طلبًا',
    currency: 'جنيه', monthly: 'شهرك بـ {price} جنيه بس', excluded: 'العرض مش على الفئة دي', choose: 'اختار {tier}',
    'days.one': "يوم واحد", 'days.two': "يومين", 'days.few': "{count} أيام", 'days.many': "{count} يوم", 'days.other': "{count} يوم", 'months.one': "شهر واحد", 'months.two': "شهرين", 'months.few': "{count} شهور", 'months.many': "{count} شهر", 'months.other': "{count} شهر", month: 'شهر', remaining: "{days} · {hours}", 'remainingDays.one': "يوم واحد", 'remainingDays.two': "يومين", 'remainingDays.few': "{days} أيام", 'remainingDays.many': "{days} يوم", 'remainingDays.other': "{days} يوم", 'remainingHours.one': "ساعة واحدة", 'remainingHours.two': "ساعتين", 'remainingHours.few': "{hours} ساعات", 'remainingHours.many': "{hours} ساعة", 'remainingHours.other': "{hours} ساعة", ended: 'العرض خلص',
    empty: 'لسه مفيش باقات متاحة', loading: 'بنحمّل…', error: 'الطلب متعملش. جرّب تاني', retry: 'جرّب تاني',
    renewal: 'طلب تجديد', sent: 'طلب التجديد اتبعت للكابتن', pending: 'طلب تجديد مستني الموافقة', cancel: 'إلغاء الطلب',
    approve: 'وافق', decline: 'ارفض', requests: 'طلبات التجديد', noRequests: 'لسه مفيش طلبات تجديد',
    expired: 'العرض خلص، السعر رجع عادي', saved: 'القرار اتحفظ', renew: 'جدّد باقتك', back: 'اقفل',
    'bonus.one': "يوم هدية", 'bonus.two': "يومين هدية", 'bonus.few': "{days} أيام هدية", 'bonus.many': "{days} يوم هدية", 'bonus.other': "{days} يوم هدية",
    percentOffer: 'خصم {value}% على باقات {durations}', amountOffer: 'خصم {value} جنيه على باقات {durations}',
    'bonusOffer.one': "يوم واحد هدية على باقات {durations}", 'bonusOffer.two': "يومين هدية على باقات {durations}", 'bonusOffer.few': "{value} أيام هدية على باقات {durations}", 'bonusOffer.many': "{value} يوم هدية على باقات {durations}", 'bonusOffer.other': "{value} يوم هدية على باقات {durations}", durationSeparator: ' و',
  },
  en: {
    unfreezeFirst: 'Unfreeze the player first',
    year: '1 year',
    title: 'Choose your plan with Captain {name}', hint: 'You can change your plan when you renew', popular: 'Most popular',
    currency: 'EGP', monthly: 'Only EGP {price} per month', excluded: 'Offer does not cover this tier', choose: 'Choose {tier}',
    'days.one': "{count} day", 'days.other': "{count} days", 'months.one': "{count} month", 'months.other': "{count} months", month: '1 month', remaining: "{days} · {hours}", 'remainingDays.one': "{days} day", 'remainingDays.other': "{days} days", 'remainingHours.one': "{hours} hour", 'remainingHours.other': "{hours} hours", ended: 'Offer ended',
    empty: 'No packages available', loading: 'Loading…', error: 'Request failed. Try again', retry: 'Try again',
    renewal: 'Renewal request', sent: 'Renewal request sent to your captain', pending: 'Renewal awaiting approval', cancel: 'Cancel request',
    approve: 'Approve', decline: 'Decline', requests: 'Renewal requests', noRequests: 'No renewal requests',
    expired: 'Offer ended. Regular price applies', saved: 'Decision saved', renew: 'Renew your plan', back: 'Close',
    'bonus.one': "{days} bonus day", 'bonus.other': "{days} bonus days",
    percentOffer: '{value}% off {durations} packages', amountOffer: 'EGP {value} off {durations} packages',
    'bonusOffer.one': "{value} bonus day on {durations} packages", 'bonusOffer.other': "{value} bonus days on {durations} packages", durationSeparator: ' and ',
  },
});
