import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    title: 'المبالغ المستنية', total: 'جنيه مستني من {n} لاعبين', currency: '{amount} جنيه',
    unpriced: 'من غير سعر', unknown: '{n} لاعبين من غير سعر', empty: 'مفيش مبالغ مستنية',
    expired: 'خلص من {n} أيام', renewal_pending: 'طلب تجديد مستني', receipt_pending: 'إيصال مستني مراجعتك',
    partial: 'باقي دفعة من {date}', soon: 'بيخلص خلال {n} أيام', today: 'بيخلص النهارده', tomorrow: 'بيخلص بكرة',
    late: 'متأخر', waiting: 'مستني', upcoming: 'قريب', since: 'من {date}',
    loading: 'بنحسب المبالغ المستنية', error: 'مش قادرين نجيب المبالغ المستنية', retry: 'حاول تاني',
  },
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? {
    title: 'المبالغ المستحقة', total: 'جنيه مستحق من {n} لاعبين', currency: '{amount} جنيه',
    unpriced: 'بلا سعر', unknown: '{n} لاعبين بلا سعر', empty: 'لا توجد مبالغ مستحقة',
    expired: 'انتهى منذ {n} أيام', renewal_pending: 'طلب تجديد قيد الانتظار', receipt_pending: 'إيصال بانتظار مراجعتك',
    partial: 'متبقي دفعة منذ {date}', soon: 'ينتهي خلال {n} أيام', today: 'ينتهي اليوم', tomorrow: 'ينتهي غداً',
    late: 'متأخر', waiting: 'بانتظار المراجعة', upcoming: 'قريب', since: 'منذ {date}',
    loading: 'جارٍ حساب المبالغ المستحقة', error: 'تعذر تحميل المبالغ المستحقة', retry: 'إعادة المحاولة',
  } as const : undefined; },
  en: {
    title: 'Money owed', total: 'EGP waiting from {n} players', currency: '{amount} EGP',
    unpriced: 'No price', unknown: '{n} players without a price', empty: 'Nobody owes money',
    expired: 'Expired {n} days ago', renewal_pending: 'Renewal pending', receipt_pending: 'Receipt awaiting review',
    partial: 'Payment balance since {date}', soon: 'Ends in {n} days', today: 'Ends today', tomorrow: 'Ends tomorrow',
    late: 'Overdue', waiting: 'Pending', upcoming: 'Soon', since: 'Since {date}',
    loading: 'Loading money owed', error: 'Could not load money owed', retry: 'Try again',
  },
});
