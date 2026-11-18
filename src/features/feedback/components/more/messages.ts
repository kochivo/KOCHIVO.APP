import { defineMessages } from '@/core/i18n/messages';

const arStd = { feedback: 'أرسل ملاحظة' } as const;

export const messages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { feedback: 'ابعت ملاحظة' },
  en: { feedback: 'Send feedback' },
});
