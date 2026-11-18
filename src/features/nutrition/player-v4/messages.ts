import { defineMessages } from '@/core/i18n/messages';

const arStd = { food: 'طعامي', remaining: 'المتبقي', cup: '+ كوب', liters: 'من {goal} لتر', swap: 'بدّل صنفاً', back: 'العودة إلى الطعام', all: 'الكل', aisles: 'أقسام التسوق',
  week: 'هذا الأسبوع · {days} أيام', protein: 'لحوم ودواجن', produce: 'خضار وفاكهة', dairy: 'ألبان', pantry: 'حبوب وبقالة', other: 'أصناف أخرى', grams: 'غ', target: '{plan} · {goal} سعرة',
  empty: 'لا توجد مشتريات لهذا الأسبوع', pricedOnly: 'إجمالي الأصناف المسعّرة' } as const;

export const messages = defineMessages({
  ar: { food: 'أكلي', remaining: 'فاضل', cup: '+ كوباية', liters: 'من {goal} لتر', swap: 'بدّل صنف', back: 'ارجع للأكل', all: 'الكل', aisles: 'أقسام المشتريات',
    week: 'الأسبوع ده · {days} أيام', protein: 'فراخ ولحمة', produce: 'خضار وفاكهة', dairy: 'ألبان', pantry: 'نشويات وبقالة', other: 'أصناف تانية', grams: 'جم', target: '{plan} · {goal} سعر',
    empty: 'مفيش مشتريات للأسبوع ده', pricedOnly: 'إجمالي الأصناف اللي ليها سعر' },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  en: { food: 'My food', remaining: 'Left', cup: '+ Cup', liters: 'of {goal} L', swap: 'Swap an item', back: 'Back to food', all: 'All', aisles: 'Shopping aisles',
    week: 'This week · {days} days', protein: 'Meat and eggs', produce: 'Produce', dairy: 'Dairy', pantry: 'Pantry', other: 'Other', grams: 'g', target: '{plan} · {goal} kcal',
    empty: 'Nothing to buy this week', pricedOnly: 'Total for priced items' },
});
