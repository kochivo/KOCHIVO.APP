import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './v6-messages-standard';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { assessments: 'التقييمات الجاية', due: 'مطلوبة {date}', answer: 'جاوب',
    noAssessments: 'مفيش تقييمات مطلوبة دلوقتي', failed: 'مش قادرين نحمّل التقييمات', retry: 'جرّب تاني',
    replyTime: 'بيرد عادة خلال يوم', profile: 'بيانات الكابتن والاشتراك', },
  en: { assessments: 'Upcoming assessments', due: 'Due {date}', answer: 'Answer',
    noAssessments: 'No assessments due', failed: 'Could not load assessments', retry: 'Try again',
    replyTime: 'Usually replies within a day', profile: 'Coach and subscription details', },
});
