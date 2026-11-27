import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    open: 'تفاصيل الشيت الأصلي', title: 'تفاصيل الشيت', back: 'ارجع للقالب',
    sheet: 'التبويب', search: 'دور جوّه التبويب', submit: 'ابحث', empty: 'التبويب ده فاضي.', noMatches: 'مفيش صفوف مطابقة.',
    unavailable: 'تفاصيل الشيت مش متاحة دلوقتي.', retry: 'حاول تاني',
    snapshot: 'القيم والملاحظات زي ما كانت وقت الاستيراد. عدّل الخطة من محرر القالب.',
  },
  arStd: {
    open: 'تفاصيل الملف الأصلي', title: 'تفاصيل الملف', back: 'ارجع إلى القالب',
    sheet: 'ورقة العمل', search: 'ابحث في الورقة', submit: 'ابحث', empty: 'ورقة العمل فارغة.', noMatches: 'لا توجد صفوف مطابقة.',
    unavailable: 'تعذّر عرض تفاصيل الملف الآن.', retry: 'حاول مجددًا',
    snapshot: 'القيم والملاحظات كما كانت وقت الاستيراد. عدّل الخطة من محرر القالب.',
  },
  en: {
    open: 'Original workbook details', title: 'Workbook details', back: 'Back to template',
    sheet: 'Worksheet', search: 'Search this sheet', submit: 'Search', empty: 'This sheet is empty.', noMatches: 'No rows match your search.',
    unavailable: 'Workbook details are unavailable.', retry: 'Try again',
    snapshot: 'Values and notes reflect the workbook at import. Edit the plan in the template editor.',
  },
});
