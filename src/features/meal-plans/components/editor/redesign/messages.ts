import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: { targets: 'الأهداف اليومية', hint: 'دوس على أي رقم وغيّره', remaining: 'فاضل {k} سعر · بروتين {p} من {t}',
    addTo: 'ضيف أكلة لـ{meal}', chooseMeal: 'ضيف {food} لـ:', add: 'ضيف', time: 'معاد الوجبة', menu: 'خيارات الوجبة',
    rename: 'غيّر الاسم', duplicate: 'كرّر الوجبة', breakfast: 'الفطار', snack: 'سناك', lunch: 'الغدا', dinner: 'العشا', meal: 'وجبة {n}',
    grams: 'جرام', alternatives: 'بدائل {n}', addMeal: 'ضيف وجبة' },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? { targets: 'الأهداف اليومية', hint: 'اضغط على أي رقم لتعديله', remaining: 'متبقّي {k} سعرة · بروتين {p} من {t}',
    addTo: 'أضف أكلة لـ{meal}', chooseMeal: 'أضف {food} إلى:', add: 'أضف', time: 'وقت الوجبة', menu: 'خيارات الوجبة',
    rename: 'غيّر الاسم', duplicate: 'كرّر الوجبة', breakfast: 'الفطور', snack: 'وجبة خفيفة', lunch: 'الغداء', dinner: 'العشاء', meal: 'وجبة {n}',
    grams: 'جرام', alternatives: 'بدائل {n}', addMeal: 'أضف وجبة' } as const : undefined; },
  en: { targets: 'Daily targets', hint: 'Press a number to edit', remaining: '{k} kcal remaining · Protein {p} of {t}',
    addTo: 'Add food to {meal}', chooseMeal: 'Add {food} to:', add: 'Add', time: 'Meal time', menu: 'Meal options',
    rename: 'Rename', duplicate: 'Duplicate meal', breakfast: 'Breakfast', snack: 'Snack', lunch: 'Lunch', dinner: 'Dinner', meal: 'Meal {n}',
    grams: 'grams', alternatives: 'Alternatives {n}', addMeal: 'Add meal' },
});
