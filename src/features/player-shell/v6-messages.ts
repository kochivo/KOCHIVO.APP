import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: { assessments: 'التقييمات الجاية', due: 'مطلوبة {date}', answer: 'جاوب',
    noAssessments: 'مفيش تقييمات مطلوبة دلوقتي', failed: 'مش قادرين نحمّل التقييمات', retry: 'جرّب تاني',
    replyTime: 'بيرد عادة خلال يوم', profile: 'بيانات الكابتن والاشتراك', },
  en: { assessments: 'Upcoming assessments', due: 'Due {date}', answer: 'Answer',
    noAssessments: 'No assessments due', failed: 'Could not load assessments', retry: 'Try again',
    replyTime: 'Usually replies within a day', profile: 'Coach and subscription details', },
});
