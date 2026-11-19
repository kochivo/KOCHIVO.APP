import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './library-messages-standard';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    training: 'خطط التمارين', trainingSub: 'خططك الجاهزة. تستخدمها لأي لاعب وتعدّل عليها', newTraining: 'خطة جديدة',
    nutrition: 'الأنظمة الغذائية', nutritionSub: 'أنظمة جاهزة تبدأ منها نظام أي لاعب', newNutrition: 'نظام جديد',
    all: 'الكل', beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم', search: 'دوّر على خطة',
    'days.one': "يوم واحد", 'days.two': "يومين", 'days.few': "{days} أيام", 'days.many': "{days} يوم", 'days.other': "{days} يوم", 'minutes.one': "دقيقة واحدة", 'minutes.two': "دقيقتين", 'minutes.few': "{minutes} دقايق", 'minutes.many': "{minutes} دقيقة", 'minutes.other': "{minutes} دقيقة", gym: 'جيم كامل', dumbbells: 'دامبلز', bodyweight: 'من غير أجهزة',
    'used.one': "مع لاعب واحد", 'used.two': "مع لاعبين", 'used.few': "مع {n} لاعيبة", 'used.many': "مع {n} لاعب", 'used.other': "مع {n} لاعب", usedOne: 'مع 1 لاعب', unusedTraining: 'مش مستخدمة', unusedNutrition: 'مش مستخدم', open: 'افتح',
    'meals.one': "وجبة واحدة",
    'meals.two': "وجبتين",
    'meals.few': "{meals} وجبات",
    'meals.many': "{meals} وجبة",
    'meals.other': "{meals} وجبة", protein: '{protein} بروتين', split: 'يوم تمرين ويوم راحة',
    emptyNutrition: 'لسه معملتش نظام', emptyTraining: 'لسه معملتش خطة', noMatches: 'مفيش خطط بالبحث ده',
    more: 'خيارات الخطة', archive: 'أرشف', restore: 'رجّع', archived: 'المؤرشفة', tools: 'أدوات', back: 'ارجع للمكتبة',
  },
  en: {
    training: 'Training plans', trainingSub: 'Ready plans to use and adapt for any player', newTraining: 'New plan',
    nutrition: 'Meal plans', nutritionSub: 'Templates to start any player’s plan', newNutrition: 'New plan',
    all: 'All', beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', search: 'Search plans',
    'days.one': "{days} day", 'days.other': "{days} days", 'minutes.one': "{minutes} minute", 'minutes.other': "{minutes} minutes", gym: 'Full gym', dumbbells: 'Dumbbells', bodyweight: 'No equipment',
    'used.one': "With {n} player", 'used.other': "With {n} players", usedOne: 'With 1 player', unusedTraining: 'Unused', unusedNutrition: 'Unused', open: 'Open',
    'meals.one': "{meals} meal",
    'meals.other': "{meals} meals", protein: '{protein} protein', split: 'Training and rest days',
    emptyNutrition: 'No meal plans yet', emptyTraining: 'No training plans yet', noMatches: 'No matching plans',
    more: 'Plan options', archive: 'Archive', restore: 'Restore', archived: 'Archived', tools: 'Tools', back: 'Back to library',
  },
});
