import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './v6-messages-standard';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { title: 'التقييمات', progress: '{n} من {total}', back: 'رجوع', next: 'التالي', finish: 'ابعت الإجابات',
    offline: 'إجاباتك بتتحفظ لو النت فصل', photo: 'صوّر أو اختار صورة من المعرض', camera: 'تصوّر', gallery: 'من المعرض', close: 'اقفل' },
  en: { title: 'Assessments', progress: '{n} of {total}', back: 'Back', next: 'Next', finish: 'Send answers',
    offline: 'Your answers are saved if you go offline', photo: 'Take a photo or pick one from your gallery', camera: 'Camera', gallery: 'From gallery', close: 'Close' },
});
