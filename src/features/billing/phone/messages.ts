import { defineMessages } from '@/core/i18n/messages';

const arStd = {
  income: 'دخل الشهر', forecast: 'من {expected} متوقعة · بانتظار {waiting}',
  all: 'الكل', overdue: 'متأخر', ending: 'ينتهي قريبًا', paid: 'دفع',
  paidTag: 'مدفوع', paidAmount: 'دفع {amount}', remind: 'تذكير',
  endingToday: "ينتهي اليوم", 'endingIn.one': "ينتهي غدًا", 'endingIn.two': "ينتهي خلال يومين", 'endingIn.few': "ينتهي خلال {count} أيام", 'endingIn.many': "ينتهي خلال {count} يومًا", 'endingIn.other': "ينتهي خلال {count} يوم", details: 'بحث وفلاتر إضافية', record: 'سجّل دفعة',
} as const;

export const messages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    income: 'دخل الشهر', forecast: 'من {expected} متوقعة · مستني {waiting}',
    all: 'الكل', overdue: 'متأخر', ending: 'بيخلص', paid: 'دافع',
    paidTag: 'مدفوع', paidAmount: 'دفع {amount}', remind: 'فكّره',
    endingToday: "بيخلص النهارده", 'endingIn.one': "بيخلص بكرة", 'endingIn.two': "بيخلص بعد يومين", 'endingIn.few': "بيخلص بعد {count} أيام", 'endingIn.many': "بيخلص بعد {count} يوم", 'endingIn.other': "بيخلص بعد {count} يوم", details: 'بحث وفلاتر تانية', record: 'سجّل دفعة',
  },
  en: {
    income: 'Monthly income', forecast: 'Of {expected} expected · {waiting} outstanding',
    all: 'All', overdue: 'Overdue', ending: 'Ending', paid: 'Paid',
    paidTag: 'Paid', paidAmount: 'Paid {amount}', remind: 'Remind',
    endingToday: 'Ends today', 'endingIn.one': "Ends tomorrow", 'endingIn.other': "Ends in {count} days", details: 'Search and more filters', record: 'Record payment',
  },
});
