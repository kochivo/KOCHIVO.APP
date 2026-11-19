import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    title: 'المبالغ المستنية', 'total.one': "جنيه مستني من لاعب واحد", 'total.two': "جنيه مستني من لاعبين", 'total.few': "جنيه مستني من {count} لاعبين", 'total.many': "جنيه مستني من {count} لاعب", 'total.other': "جنيه مستني من {count} لاعب", currency: '{amount} جنيه',
    unpriced: 'من غير سعر', 'unknown.one': "لاعب واحد من غير سعر", 'unknown.two': "لاعبين من غير سعر", 'unknown.few': "{count} لاعبين من غير سعر", 'unknown.many': "{count} لاعب من غير سعر", 'unknown.other': "{count} لاعب من غير سعر", empty: 'مفيش مبالغ مستنية',
    expiredToday: "خلص النهارده", 'expired.one': "خلص امبارح", 'expired.two': "خلص من يومين", 'expired.few': "خلص من {count} أيام", 'expired.many': "خلص من {count} يوم", 'expired.other': "خلص من {count} يوم", renewal_pending: 'طلب تجديد مستني', receipt_pending: 'إيصال مستني مراجعتك',
    partial: 'باقي دفعة من {date}', 'soon.one': "بيخلص بكرة", 'soon.two': "بيخلص خلال يومين", 'soon.few': "بيخلص خلال {count} أيام", 'soon.many': "بيخلص خلال {count} يوم", 'soon.other': "بيخلص خلال {count} يوم", today: 'بيخلص النهارده', tomorrow: 'بيخلص بكرة',
    late: 'متأخر', waiting: 'مستني', upcoming: 'قريب', since: 'من {date}',
    loading: 'بنحسب المبالغ المستنية', error: 'مش قادرين نجيب المبالغ المستنية', retry: 'حاول تاني',
  },
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? {
    title: 'المبالغ المستحقة', 'total.one': "جنيه مستحق من لاعب واحد", 'total.two': "جنيه مستحق من لاعبين", 'total.few': "جنيه مستحق من {count} لاعبين", 'total.many': "جنيه مستحق من {count} لاعبًا", 'total.other': "جنيه مستحق من {count} لاعب", currency: '{amount} جنيه',
    unpriced: 'بلا سعر', 'unknown.one': "لاعب واحد بلا سعر", 'unknown.two': "لاعبان بلا سعر", 'unknown.few': "{count} لاعبين بلا سعر", 'unknown.many': "{count} لاعبًا بلا سعر", 'unknown.other': "{count} لاعب بلا سعر", empty: 'لا توجد مبالغ مستحقة',
    expiredToday: "انتهى اليوم", 'expired.one': "انتهى أمس", 'expired.two': "انتهى منذ يومين", 'expired.few': "انتهى منذ {count} أيام", 'expired.many': "انتهى منذ {count} يومًا", 'expired.other': "انتهى منذ {count} يوم", renewal_pending: 'طلب تجديد قيد الانتظار', receipt_pending: 'إيصال بانتظار مراجعتك',
    partial: 'متبقي دفعة منذ {date}', 'soon.one': "ينتهي غدًا", 'soon.two': "ينتهي خلال يومين", 'soon.few': "ينتهي خلال {count} أيام", 'soon.many': "ينتهي خلال {count} يومًا", 'soon.other': "ينتهي خلال {count} يوم", today: 'ينتهي اليوم', tomorrow: 'ينتهي غداً',
    late: 'متأخر', waiting: 'بانتظار المراجعة', upcoming: 'قريب', since: 'منذ {date}',
    loading: 'جارٍ حساب المبالغ المستحقة', error: 'تعذر تحميل المبالغ المستحقة', retry: 'إعادة المحاولة',
  } as const : undefined; },
  en: {
    title: 'Money owed', 'total.one': "EGP waiting from {count} player", 'total.other': "EGP waiting from {count} players", currency: '{amount} EGP',
    unpriced: 'No price', 'unknown.one': "{count} player without a price", 'unknown.other': "{count} players without a price", empty: 'Nobody owes money',
    expiredToday: 'Expired today', 'expired.one': "Expired yesterday", 'expired.other': "Expired {count} days ago", renewal_pending: 'Renewal pending', receipt_pending: 'Receipt awaiting review',
    partial: 'Payment balance since {date}', 'soon.one': "Ends tomorrow", 'soon.other': "Ends in {count} days", today: 'Ends today', tomorrow: 'Ends tomorrow',
    late: 'Overdue', waiting: 'Pending', upcoming: 'Soon', since: 'Since {date}',
    loading: 'Loading money owed', error: 'Could not load money owed', retry: 'Try again',
  },
});
