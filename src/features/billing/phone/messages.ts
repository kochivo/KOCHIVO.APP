import { defineMessages } from '@/core/i18n/messages';

const arStd = {
  income: 'دخل الشهر', forecast: 'من {expected} متوقعة · بانتظار {waiting}',
  all: 'الكل', overdue: 'متأخر', ending: 'ينتهي قريبًا', paid: 'دفع',
  paidTag: 'مدفوع', paidAmount: 'دفع {amount}', remind: 'تذكير',
  endingIn: 'ينتهي خلال {count} يوم', details: 'بحث وفلاتر إضافية', record: 'سجّل دفعة',
} as const;

export const messages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    income: 'دخل الشهر', forecast: 'من {expected} متوقعة · مستني {waiting}',
    all: 'الكل', overdue: 'متأخر', ending: 'بيخلص', paid: 'دافع',
    paidTag: 'مدفوع', paidAmount: 'دفع {amount}', remind: 'فكّره',
    endingIn: 'بيخلص بعد {count} يوم', details: 'بحث وفلاتر تانية', record: 'سجّل دفعة',
  },
  en: {
    income: 'Monthly income', forecast: 'Of {expected} expected · {waiting} outstanding',
    all: 'All', overdue: 'Overdue', ending: 'Ending', paid: 'Paid',
    paidTag: 'Paid', paidAmount: 'Paid {amount}', remind: 'Remind',
    endingIn: 'Ends in {count} days', details: 'Search and more filters', record: 'Record payment',
  },
});
