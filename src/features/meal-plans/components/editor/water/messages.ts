import { defineMessages } from '@/core/i18n/messages';

const arStd = { label: 'الماء يوميًا (لتر)', automatic: 'تلقائي', hint: 'تلقائي حسب الوزن: {litres} لتر', empty: 'اتركه فارغًا للحساب التلقائي' } as const;

export const messages = defineMessages({
  ar: { label: 'المياه في اليوم (لتر)', automatic: 'تلقائي', hint: 'تلقائي حسب الوزن: {litres} لتر', empty: 'سيبها فاضية للحساب التلقائي' },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  en: { label: 'Water a day (L)', automatic: 'Automatic', hint: 'Automatic by weight: {litres} L', empty: 'Leave empty for automatic' },
});
