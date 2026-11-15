import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: { swapped: 'اتبدّل الصنف', detail: '{name} · {grams} جم' },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? {
    swapped: 'استُبدل الصنف', detail: '{name} · {grams} غ',
  } as const : undefined; },
  en: { swapped: 'Food swapped', detail: '{name} · {grams} g' },
});
