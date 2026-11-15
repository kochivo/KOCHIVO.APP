import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    replySent: "اتبعت ردك لـ{name}",
    name: "{name}",
  },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? {
    replySent: "أُرسل ردك إلى {name}",
    name: "{name}",
  } as const : undefined; },
  en: {
    replySent: "Reply sent to {name}",
    name: "{name}",
  },
});
