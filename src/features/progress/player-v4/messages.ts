import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: { title: 'تقدّمي', recent: 'آخر 8 أسابيع', two: 'شهرين', six: '6 شهور', photos: 'صوري', history: 'سجل المتابعة', body: 'الجسم', training: 'التمرين', records: 'السجل', firstWeight: 'التغيّر هيظهر بعد القياس الجاي', lastWeight: 'آخر وزن', measurements: 'قياسات الجسم', scans: 'فحوصات InBody' },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? { title: 'تقدّمي', recent: 'آخر 8 أسابيع', two: 'شهران', six: '6 أشهر', photos: 'صوري', history: 'سجل المتابعة', body: 'الجسم', training: 'التمرين', records: 'السجل', firstWeight: 'سيظهر التغيّر بعد القياس التالي', lastWeight: 'آخر وزن', measurements: 'قياسات الجسم', scans: 'فحوصات InBody' } : undefined; },
  en: { title: 'My progress', recent: 'Last 8 weeks', two: '2 months', six: '6 months', photos: 'My photos', history: 'Check-in history', body: 'Body', training: 'Training', records: 'History', firstWeight: 'Your change will show after your next measurement', lastWeight: 'Latest weight', measurements: 'Body measurements', scans: 'InBody scans' },
});
