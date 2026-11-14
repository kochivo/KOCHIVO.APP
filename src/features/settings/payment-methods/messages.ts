import { defineMessages } from '@/core/i18n/messages';

const arStd = {
  title: 'طرق الدفع المقبولة', instapay: 'InstaPay', vodafone_cash: 'فودافون كاش', cash: 'نقدًا في النادي',
  bank_transfer: 'تحويل بنكي', account: 'تفاصيل الحساب', empty: 'لا توجد طرق دفع مفعّلة',
  loading: 'جارٍ تحميل طرق الدفع…', error: 'تعذر حفظ طرق الدفع. راجع التفاصيل وحاول مجددًا', retry: 'حاول مجددًا',
};
export const messages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    title: 'طرق الدفع اللي بتقبلها', instapay: 'InstaPay', vodafone_cash: 'فودافون كاش', cash: 'كاش في الجيم',
    bank_transfer: 'تحويل بنكي', account: 'تفاصيل الحساب', empty: 'مفيش طرق دفع مفعّلة',
    loading: 'بنحمّل طرق الدفع…', error: 'طرق الدفع متحفظتش. راجع التفاصيل وجرّب تاني', retry: 'جرّب تاني',
  },
  en: {
    title: 'Payment methods you accept', instapay: 'InstaPay', vodafone_cash: 'Vodafone Cash', cash: 'Cash at the gym',
    bank_transfer: 'Bank transfer', account: 'Account details', empty: 'No payment methods enabled',
    loading: 'Loading payment methods…', error: 'Could not save payment methods. Check the details and retry', retry: 'Retry',
  },
});
