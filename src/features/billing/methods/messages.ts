import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    title: 'طرق الدفع اللي بتقبلها', method: 'طريقة الدفع', instapay: 'InstaPay', vodafone_cash: 'فودافون كاش',
    cash: 'كاش في الجيم', bank_transfer: 'تحويل بنكي', account: 'تفاصيل الحساب', copy: 'انسخ', copied: 'اتنسخ',
    copyFailed: 'النسخ منفعش. انسخ التفاصيل يدويًا', empty: 'مفيش طرق دفع مفعّلة', unset: '—',
    loading: 'بنحمّل طرق الدفع…', error: 'طرق الدفع متحفظتش. راجع التفاصيل وجرّب تاني', retry: 'جرّب تاني',
    choose: 'اختار طريقة الدفع', save: 'احفظ طرق الدفع', saved: 'طرق الدفع اتحفظت', saving: 'بنحفظ…',
  },
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? {
    title: 'طرق الدفع المقبولة', method: 'طريقة الدفع', instapay: 'InstaPay', vodafone_cash: 'فودافون كاش',
    cash: 'نقدًا في النادي', bank_transfer: 'تحويل بنكي', account: 'تفاصيل الحساب', copy: 'انسخ', copied: 'تم النسخ',
    copyFailed: 'تعذر النسخ. انسخ التفاصيل يدويًا', empty: 'لا توجد طرق دفع مفعّلة', unset: '—',
    loading: 'جارٍ تحميل طرق الدفع…', error: 'تعذر حفظ طرق الدفع. راجع التفاصيل وحاول مجددًا', retry: 'حاول مجددًا',
    choose: 'اختر طريقة الدفع', save: 'احفظ طرق الدفع', saved: 'تم حفظ طرق الدفع', saving: 'جارٍ الحفظ…',
  } as const : undefined; },
  en: {
    title: 'Payment methods you accept', method: 'Payment method', instapay: 'InstaPay', vodafone_cash: 'Vodafone Cash',
    cash: 'Cash at the gym', bank_transfer: 'Bank transfer', account: 'Account details', copy: 'Copy', copied: 'Copied',
    copyFailed: 'Could not copy. Copy the details manually', empty: 'No payment methods enabled', unset: '—',
    loading: 'Loading payment methods…', error: 'Could not save payment methods. Check the details and retry', retry: 'Retry',
    choose: 'Choose a payment method', save: 'Save payment methods', saved: 'Payment methods saved', saving: 'Saving…',
  },
});
