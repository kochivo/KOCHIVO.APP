import { defineMessages } from '@/core/i18n/messages';

const arStd = { time: 'الإحماء: {minutes} د' } as const;
export const messages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { time: 'التسخين: {minutes} د' },
  en: { time: 'Warm-up: {minutes} min' },
});
