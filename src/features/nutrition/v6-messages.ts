import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: { today: 'أكلك النهارده', kcal: 'سعرات', protein: 'بروتين', coach: 'من الكابتن:',
    trainingDay: 'يوم تمرين', restDay: 'يوم راحة', dayTypeRetry: 'مش قادرين نحمّل نوع اليوم. جرّب تاني',
    details: 'تفاصيل الوجبة والبدائل', otherMacros: 'كارب {carbs} / {carbsTarget} جم · دهون {fat} / {fatTarget} جم' },
  en: { today: 'Your food today', kcal: 'Calories', protein: 'Protein', coach: 'From your coach:',
    trainingDay: 'Training day', restDay: 'Rest day', dayTypeRetry: 'Could not load the day type. Try again',
    details: 'Meal details and swaps', otherMacros: 'Carbs {carbs} / {carbsTarget} g · Fat {fat} / {fatTarget} g' },
});
