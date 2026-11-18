import { defineMessages } from '@/core/i18n/messages';

const arStd = {
  'waiting.one': 'مهمة واحدة بانتظارك', 'waiting.other': '{count} مهام بانتظارك', estimate: 'حوالي {minutes} دقيقة', first: 'ابدأ بـ{task}',
  'reviews.one': 'تقييم واحد', 'reviews.other': '{count} تقييمات', 'payments.one': 'دفعة واحدة', 'payments.other': '{count} دفعات', other: '{count} بانتظارك',
  adherence: 'الالتزام', trained: 'تمرّنوا', total: 'من {count}', month: 'دخل الشهر',
  needs: 'يحتاجون إلى متابعة', reply: 'ردّ', message: 'أرسل رسالة', absence: 'غائب منذ {days} أيام',
  recordPayment: 'سجّل دفعة', balance: 'المتبقي {amount} جنيه',
} as const;

export const phoneHomeMessages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    'waiting.one': 'حاجة واحدة مستنياك', 'waiting.other': '{count} حاجات مستنياك', estimate: 'حوالي {minutes} دقيقة', first: 'ابدأ بـ{task}',
    'reviews.one': 'تقييم واحد', 'reviews.other': '{count} تقييمات', 'payments.one': 'دفعة واحدة', 'payments.other': '{count} دفعة', other: '{count} مستنيك',
    adherence: 'التزام', trained: 'اتمرنوا', total: 'من {count}', month: 'دخل الشهر',
    needs: 'محتاجين نظرة', reply: 'رد', message: 'ابعت رسالة', absence: 'غايب من {days} أيام',
    recordPayment: 'سجّل دفعة', balance: 'باقي عليه {amount} جنيه',
  },
  en: {
    'waiting.one': '1 task waiting', 'waiting.other': '{count} tasks waiting', estimate: 'About {minutes} minutes', first: 'Start with {task}',
    'reviews.one': '1 review', 'reviews.other': '{count} reviews', 'payments.one': '1 payment', 'payments.other': '{count} payments', other: '{count} waiting',
    adherence: 'Adherence', trained: 'Trained', total: 'of {count}', month: 'This month',
    needs: 'Needs a look', reply: 'Reply', message: 'Message', absence: 'Away for {days} days',
    recordPayment: 'Record payment', balance: 'EGP {amount} due',
  },
});
