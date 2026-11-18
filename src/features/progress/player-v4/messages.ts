import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: { title: 'تقدّمي', recent: 'آخر 8 أسابيع', two: 'شهرين', six: '6 شهور', photos: 'صوري', history: 'سجل المتابعة' },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? { title: 'تقدّمي', recent: 'آخر 8 أسابيع', two: 'شهران', six: '6 أشهر', photos: 'صوري', history: 'سجل المتابعة' } : undefined; },
  en: { title: 'My progress', recent: 'Last 8 weeks', two: '2 months', six: '6 months', photos: 'My photos', history: 'Check-in history' },
});
