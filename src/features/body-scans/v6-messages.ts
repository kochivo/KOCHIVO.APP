import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './v6-messages-standard';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { dates: 'آخر فحص {latest} · أول فحص {first}' },
  en: { dates: 'Latest scan {latest} · First scan {first}' },
});
