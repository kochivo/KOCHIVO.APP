import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    waiting: 'مستني الأنظمة', explanation: 'الاشتراك هيبدأ لما تحط نظام التمرين ونظام الأكل',
    trainingMissing: 'نظام التمرين ناقص', nutritionMissing: 'نظام الأكل ناقص',
    start: 'ابدأ الاشتراك دلوقتي', starting: 'بنبدأ الاشتراك…',
    started: 'الاشتراك بدأ', detail: 'العد بدأ من دلوقتي', error: 'مش قادرين نبدأ الاشتراك. جرّب تاني',
  },
  arStd: {
    waiting: 'بانتظار الخطط', explanation: 'يبدأ الاشتراك عند إعداد خطة التمرين وخطة التغذية',
    trainingMissing: 'خطة التمرين غير جاهزة', nutritionMissing: 'خطة التغذية غير جاهزة',
    start: 'ابدأ الاشتراك الآن', starting: 'جارٍ بدء الاشتراك…',
    started: 'بدأ الاشتراك', detail: 'بدأ احتساب الأيام الآن', error: 'تعذر بدء الاشتراك. حاول مرة أخرى',
  },
  en: {
    waiting: 'Waiting for plans', explanation: 'Subscription starts when the training and nutrition plans are set',
    trainingMissing: 'Training plan is missing', nutritionMissing: 'Nutrition plan is missing',
    start: 'Start subscription now', starting: 'Starting subscription…',
    started: 'Subscription started', detail: 'Your subscription clock starts now', error: 'Could not start subscription. Try again',
  },
});
