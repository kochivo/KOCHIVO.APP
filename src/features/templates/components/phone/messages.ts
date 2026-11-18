import { defineMessages } from '@/core/i18n/messages';

const arStd = {
  ready: 'من KOCHIVO',
  exercises: '{count} تمرين',
  back: 'رجوع',
  count: '{count} برنامج',
} as const;

export const messages = defineMessages({
  ar: { ready: 'من KOCHIVO', exercises: '{count} تمرين', back: 'ارجع', count: '{count} برنامج' },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  en: { ready: 'From KOCHIVO', exercises: '{count} exercises', back: 'Back', count: '{count} programs' },
});
