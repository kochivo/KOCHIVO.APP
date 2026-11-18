import { defineMessages } from '@/core/i18n/messages';

const arStd = { more: 'إجراءات أخرى' } as const;

export const messages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { more: 'إجراءات تانية' },
  en: { more: 'More actions' },
});
