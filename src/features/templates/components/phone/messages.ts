import { defineMessages } from '@/core/i18n/messages';

const arStd = {
  ready: 'من KOCHIVO',
  'exercises.one': "تمرين واحد",
  'exercises.two': "تمرينين",
  'exercises.few': "{count} تمارين",
  'exercises.many': "{count} تمرينًا",
  'exercises.other': "{count} تمرين",
  back: 'رجوع',
  'count.one': "برنامج واحد",
  'count.two': "برنامجين",
  'count.few': "{count} برامج",
  'count.many': "{count} برنامجًا",
  'count.other': "{count} برنامج",
} as const;

export const messages = defineMessages({
  ar: { ready: 'من KOCHIVO', 'exercises.one': "تمرين واحد",
    'exercises.two': "تمرينين",
    'exercises.few': "{count} تمارين",
    'exercises.many': "{count} تمرين",
    'exercises.other': "{count} تمرين", back: 'ارجع', 'count.one': "برنامج واحد",
    'count.two': "برنامجين",
    'count.few': "{count} برامج",
    'count.many': "{count} برنامج",
    'count.other': "{count} برنامج" },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  en: { ready: 'From KOCHIVO', 'exercises.one': "{count} exercise",
    'exercises.other': "{count} exercises", back: 'Back', 'count.one': "{count} program",
    'count.other': "{count} programs" },
});
