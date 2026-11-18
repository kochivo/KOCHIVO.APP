import { defineMessages } from '@/core/i18n/messages';

const arStd = { back: 'العودة إلى اللاعبين' } as const;

export const phoneMessages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { back: 'ارجع للاعبين' },
  en: { back: 'Back to players' },
});
