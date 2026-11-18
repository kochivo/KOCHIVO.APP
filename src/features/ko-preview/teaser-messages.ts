import { defineMessages } from '@/core/i18n/messages';

const arStd = {
  examples: 'أمثلة على ما يمكنك طلبه',
  request: '«{text}»',
} as const;

export const teaserMessages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    examples: 'هتقدر تقولّي حاجات زي:',
    request: '«{text}»',
  },
  en: {
    examples: 'What you can ask',
    request: '“{text}”',
  },
});
