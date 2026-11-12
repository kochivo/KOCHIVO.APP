import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './v6-messages-standard';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { progress: '{n} من {total}', skip: 'تخطّى', intro: 'الكابتن هيبني برنامجك على أساسه' },
  en: { progress: '{n} of {total}', skip: 'Skip', intro: 'Your coach will use this to build your plan' },
});
