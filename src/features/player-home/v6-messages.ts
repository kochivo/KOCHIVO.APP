import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    morning: 'جاوب على سؤالين الصبح', food: 'الأكل', water: 'المية', meals: '/ {total} وجبات',
    litres: '/ {goal} L', addWater: 'ضيف 250 مل', saveFailed: 'الحفظ متعملش. جرّب تاني.', retry: 'جرّب تاني',
    workoutDetails: 'تمرين النهارده', voice: 'اسمع رسالة الكابتن',
  },
  en: {
    morning: 'Answer two morning questions', food: 'Food', water: 'Water', meals: '/ {total} meals',
    litres: '/ {goal} L', addWater: 'Add 250 ml', saveFailed: 'Save failed. Try again.', retry: 'Try again',
    workoutDetails: 'Today’s workout', voice: 'Listen to your coach’s note',
  },
});
