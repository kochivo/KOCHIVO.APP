import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './library-messages-standard';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    training: 'خطط التمارين', trainingSub: 'خططك الجاهزة. تستخدمها لأي لاعب وتعدّل عليها', newTraining: 'خطة جديدة',
    nutrition: 'الأنظمة الغذائية', nutritionSub: 'أنظمة جاهزة تبدأ منها نظام أي لاعب', newNutrition: 'نظام جديد',
    all: 'الكل', beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم', search: 'دوّر على خطة',
    days: '{days} أيام', minutes: '{minutes} دقيقة', gym: 'جيم كامل', dumbbells: 'دامبلز', bodyweight: 'من غير أجهزة',
    used: 'مع {n} لاعيبة', usedOne: 'مع 1 لاعب', unusedTraining: 'مش مستخدمة', unusedNutrition: 'مش مستخدم', open: 'افتح',
    meals: '{meals} وجبات', protein: '{protein} بروتين', split: 'يوم تمرين ويوم راحة',
    emptyNutrition: 'لسه معملتش نظام', emptyTraining: 'لسه معملتش خطة', noMatches: 'مفيش خطط بالبحث ده',
    more: 'خيارات الخطة', archive: 'أرشف', restore: 'رجّع', archived: 'المؤرشفة', tools: 'أدوات', back: 'ارجع للمكتبة',
  },
  en: {
    training: 'Training plans', trainingSub: 'Ready plans to use and adapt for any player', newTraining: 'New plan',
    nutrition: 'Meal plans', nutritionSub: 'Templates to start any player’s plan', newNutrition: 'New plan',
    all: 'All', beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', search: 'Search plans',
    days: '{days} days', minutes: '{minutes} minutes', gym: 'Full gym', dumbbells: 'Dumbbells', bodyweight: 'No equipment',
    used: 'With {n} players', usedOne: 'With 1 player', unusedTraining: 'Unused', unusedNutrition: 'Unused', open: 'Open',
    meals: '{meals} meals', protein: '{protein} protein', split: 'Training and rest days',
    emptyNutrition: 'No meal plans yet', emptyTraining: 'No training plans yet', noMatches: 'No matching plans',
    more: 'Plan options', archive: 'Archive', restore: 'Restore', archived: 'Archived', tools: 'Tools', back: 'Back to library',
  },
});
