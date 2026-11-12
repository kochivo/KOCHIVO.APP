import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './template-messages-standard';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { title: 'خطط التمارين', back: 'ارجع للمكتبة', save: 'احفظ القالب', name: 'اسم الخطة' },
  en: { title: 'Training plans', back: 'Back to library', save: 'Save template', name: 'Plan name' },
});
