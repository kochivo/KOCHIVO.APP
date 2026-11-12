import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './library-messages-standard';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { unitSummary: '{name} · {grams} جم' },
  en: { unitSummary: '{name} · {grams} g' },
});
