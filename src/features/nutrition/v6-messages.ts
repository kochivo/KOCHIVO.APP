import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './v6-messages-standard';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { today: 'أكلك النهارده', kcal: 'سعرات', protein: 'بروتين', coach: 'من الكابتن:',
    calories: 'السعرات', leftOf: 'سعرة فاضلة من {target}', over: 'زيادة {value}', carbs: 'كارب', fat: 'دهون',
    grams: '{eaten}/{target} جم', meals: 'الوجبات', now: '· دلوقتي', eaten: 'اتاكلت', eatMeal: 'كلت {meal}',
    water: 'الميه', cups: ' / {goal} كوبايات', addWater: 'زوّد كوباية ميه',
    photo: 'صوّر أكلتك', writeFood: 'اكتب اللي كلته', soon: 'قريباً',
    waterError: 'مش قادرين نحمّل أو نحفظ الميه. جرّب تاني', retry: 'جرّب تاني',
    trainingDay: 'يوم تمرين', restDay: 'يوم راحة', dayTypeRetry: 'مش قادرين نحمّل نوع اليوم. جرّب تاني',
    details: 'تفاصيل الوجبة والبدائل', otherMacros: 'كارب {carbs} / {carbsTarget} جم · دهون {fat} / {fatTarget} جم' },
  en: { today: 'Your food today', kcal: 'Calories', protein: 'Protein', coach: 'From your coach:',
    calories: 'Calories', leftOf: 'calories left of {target}', over: 'Over {value}', carbs: 'Carbs', fat: 'Fat',
    grams: '{eaten}/{target} g', meals: 'Meals', now: '· Now', eaten: 'Eaten', eatMeal: 'Ate {meal}',
    water: 'Water', cups: ' / {goal} cups', addWater: 'Add a cup of water',
    photo: 'Take a food photo', writeFood: 'Write what you ate', soon: 'Coming soon',
    waterError: 'Could not load or save water. Try again', retry: 'Try again',
    trainingDay: 'Training day', restDay: 'Rest day', dayTypeRetry: 'Could not load the day type. Try again',
    details: 'Meal details and swaps', otherMacros: 'Carbs {carbs} / {carbsTarget} g · Fat {fat} / {fatTarget} g' },
});
