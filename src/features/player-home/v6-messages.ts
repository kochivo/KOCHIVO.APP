import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './v6-messages-standard';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
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
