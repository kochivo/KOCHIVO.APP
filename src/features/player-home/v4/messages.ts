import { defineMessages } from '@/core/i18n/messages';

const arStd = {
  tomorrow: 'اعرض تمرين الغد', stretch: 'مارس بعض تمارين الإطالة الخفيفة',
  calories: '{eaten} من {target} سعرة', protein: 'بروتين {grams} غ',
  place: 'ترتيبك في الفريق: {place}', carbs: 'الكربوهيدرات', fat: 'الدهون',
  readiness: 'جاهزيتك اليوم', sleep: 'مدة النوم: {hours} س', litres: 'من {goal} لتر',
  history: 'سجل التمارين', waterLogged: 'شربت {litres} لتر',
} as const;

export const messages = defineMessages({
  ar: {
    tomorrow: 'شوف تمرين بكره', stretch: 'اعمل شوية إطالات خفيفة',
    calories: '{eaten} من {target} سعر', protein: 'بروتين {grams} جم',
    place: 'ترتيبك في الفريق: {place}', carbs: 'الكربوهيدرات', fat: 'الدهون',
    readiness: 'جاهزيتك النهارده', sleep: 'مدة النوم: {hours} س', litres: 'من {goal} لتر',
    history: 'سجل التمارين', waterLogged: 'شربت {litres} لتر',
  },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  en: {
    tomorrow: 'See tomorrow’s workout', stretch: 'Try some gentle stretches',
    calories: '{eaten} of {target} kcal', protein: '{grams} g protein',
    place: 'Team place: {place}', carbs: 'Carbs', fat: 'Fat',
    readiness: 'Today’s readiness', sleep: 'Sleep: {hours} h', litres: 'of {goal} L',
    history: 'Workout history', waterLogged: '{litres} L logged',
  },
});
