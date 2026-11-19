import { defineMessages } from '@/core/i18n/messages';

const arStd = {
  'waiting.one': 'مهمة واحدة بانتظارك', 'waiting.other': '{count} مهام بانتظارك', 'estimate.one': "حوالي دقيقة واحدة", 'estimate.two': "حوالي دقيقتين", 'estimate.few': "حوالي {minutes} دقائق", 'estimate.many': "حوالي {minutes} دقيقة", 'estimate.other': "حوالي {minutes} دقيقة", first: 'ابدأ بـ{task}',
  'reviews.one': "تقييم واحد", 'reviews.two': "تقييمان", 'reviews.few': "{count} تقييمات", 'reviews.many': "{count} تقييمًا", 'reviews.other': "{count} تقييم", 'payments.one': "دفعة واحدة", 'payments.two': "دفعتان", 'payments.few': "{count} دفعات", 'payments.many': "{count} دفعة", 'payments.other': "{count} دفعة", other: '{count} بانتظارك',
  adherence: 'الالتزام', trained: 'تمرّنوا', total: 'من {count}', month: 'دخل الشهر',
  needs: 'يحتاجون إلى متابعة', reply: 'ردّ', message: 'أرسل رسالة', 'absence.one': "غائب منذ أمس", 'absence.two': "غائب منذ يومين", 'absence.few': "غائب منذ {days} أيام", 'absence.many': "غائب منذ {days} يومًا", 'absence.other': "غائب منذ {days} يوم",
  recordPayment: 'سجّل دفعة', balance: 'المتبقي {amount} جنيه',
} as const;

export const phoneHomeMessages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    'waiting.one': 'حاجة واحدة مستنياك', 'waiting.other': '{count} حاجات مستنياك', 'estimate.one': "حوالي دقيقة واحدة", 'estimate.two': "حوالي دقيقتين", 'estimate.few': "حوالي {minutes} دقايق", 'estimate.many': "حوالي {minutes} دقيقة", 'estimate.other': "حوالي {minutes} دقيقة", first: 'ابدأ بـ{task}',
    'reviews.one': "تقييم واحد", 'reviews.two': "تقييمين", 'reviews.few': "{count} تقييمات", 'reviews.many': "{count} تقييم", 'reviews.other': "{count} تقييم", 'payments.one': "دفعة واحدة", 'payments.two': "دفعتين", 'payments.few': "{count} دفعات", 'payments.many': "{count} دفعة", 'payments.other': "{count} دفعة", other: '{count} مستنيك',
    adherence: 'التزام', trained: 'اتمرنوا', total: 'من {count}', month: 'دخل الشهر',
    needs: 'محتاجين نظرة', reply: 'رد', message: 'ابعت رسالة', 'absence.one': "غايب من امبارح", 'absence.two': "غايب من يومين", 'absence.few': "غايب من {days} أيام", 'absence.many': "غايب من {days} يوم", 'absence.other': "غايب من {days} يوم",
    recordPayment: 'سجّل دفعة', balance: 'باقي عليه {amount} جنيه',
  },
  en: {
    'waiting.one': '1 task waiting', 'waiting.other': '{count} tasks waiting', 'estimate.one': "About {minutes} minute", 'estimate.other': "About {minutes} minutes", first: 'Start with {task}',
    'reviews.one': '1 review', 'reviews.other': '{count} reviews', 'payments.one': '1 payment', 'payments.other': '{count} payments', other: '{count} waiting',
    adherence: 'Adherence', trained: 'Trained', total: 'of {count}', month: 'This month',
    needs: 'Needs a look', reply: 'Reply', message: 'Message', 'absence.one': "Away since yesterday", 'absence.other': "Away for {days} days",
    recordPayment: 'Record payment', balance: 'EGP {amount} due',
  },
});
